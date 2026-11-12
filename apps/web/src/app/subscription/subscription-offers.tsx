"use client";
import {
  SUBSCRIPTION_TERMS_VERSION,
  clientOwnSubscriptionSchema,
  clientPublicSubscriptionOffersSchema,
  clientSubscriptionCheckoutSchema
} from "@platform/contracts/client";
import type { SubscriptionOffer } from "@platform/contracts";
import {
  Alert,
  Badge,
  Button,
  Checkbox,
  Stack,
  Surface,
  Text,
  buttonClass
} from "@platform/ui";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

import { LearningLoading } from "../../components/learning/learning-loading";
import { LearningPageHeading } from "../../components/learning/learning-page-heading";
import styles from "../../components/learning/flow.module.css";
import { track } from "../../lib/analytics/product-analytics";
import { useApiResource } from "../../lib/hooks/api-resource";
import { learningLoginUrl } from "../../lib/learning-return-to";
import { browserApiRequest } from "../../lib/public-api";
import { HOME_ORGANIZATION_SLUG } from "../../lib/public-learning-routes";
import {
  PERIOD_LABEL,
  PERIOD_SUFFIX,
  formatMoney,
  perMonth
} from "../../lib/subscription-format";

const BENEFITS = [
  "Все курсы целиком, от первой до последней главы",
  "Проверка тестов и заданий во всех главах",
  "Подтверждение навыков и рост ваших персонажей",
  "Отмена в один клик в «Моей подписке»"
];

/** Pick one currency: roubles when offered, otherwise the first one. */
function visibleOffers(offers: readonly SubscriptionOffer[]) {
  const currency = offers.some((o) => o.currency === "RUB")
    ? "RUB"
    : offers[0]?.currency;
  return offers.filter((o) => o.currency === currency);
}

export function SubscriptionOffers() {
  const org = HOME_ORGANIZATION_SLUG;
  const router = useRouter();
  const [offersResource] = useApiResource(
    `/v1/public/organizations/${org}/subscription-offers`,
    clientPublicSubscriptionOffersSchema
  );
  const [ownResource] = useApiResource(
    `/v1/me/subscriptions/${org}`,
    clientOwnSubscriptionSchema
  );
  const offers =
    offersResource.status === "ready"
      ? visibleOffers(offersResource.data.offers)
      : [];
  const [chosen, setChosen] = useState<string | null>(null);
  const selected =
    offers.find((o) => o.priceId === chosen) ??
    offers.find((o) => o.billingPeriod === "year") ??
    offers[0];
  const [agreed, setAgreed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const key = useRef<string | null>(null);
  const anonymous = ownResource.status === "anonymous";
  const own = ownResource.status === "ready" ? ownResource.data : null;
  const charging =
    own?.subscription?.status === "active" ||
    own?.subscription?.status === "past_due";

  async function pay() {
    if (!selected || busy) return;
    if (anonymous) {
      router.push(`${learningLoginUrl("/subscription")}&mode=register`);
      return;
    }
    setBusy(true);
    setError(null);
    key.current ??= crypto.randomUUID();
    void track("checkout_started", {
      period: selected.billingPeriod,
      currency: selected.currency
    });
    const start = () =>
      browserApiRequest(`/v1/me/subscriptions/${org}/checkout`, {
        method: "POST",
        body: JSON.stringify({
          priceId: selected.priceId,
          idempotencyKey: key.current,
          acceptRenewalTerms: true,
          termsVersion: SUBSCRIPTION_TERMS_VERSION
        })
      });
    try {
      let response = await start();
      if (response.status === 404) {
        // Not a member of the academy yet: the same entry as «Начать курс», then again.
        await browserApiRequest(
          `/v1/public/organizations/${org}/memberships/me`,
          { method: "POST", body: "{}" }
        );
        response = await start();
      }
      if (response.ok) {
        const { paymentUrl } = clientSubscriptionCheckoutSchema.parse(
          await response.json()
        );
        window.location.assign(paymentUrl);
        return;
      }
      setError(
        response.status === 409
          ? "У вас уже есть подписка — она в «Моей подписке»."
          : response.status === 503
            ? "Оплата подписки скоро откроется. Пока бесплатна первая глава каждого курса."
            : "Не удалось перейти к оплате. Попробуйте ещё раз."
      );
    } catch {
      setError("Нет связи. Попробуйте ещё раз.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Stack>
      <LearningPageHeading
        eyebrow="Подписка"
        title="Учитесь без ограничений"
        description="Первая глава каждого курса бесплатна. Подписка открывает всё остальное."
      />
      <ul className={styles.subscriptionBenefits}>
        {BENEFITS.map((benefit) => (
          <li key={benefit}>{benefit}</li>
        ))}
      </ul>
      {offersResource.status === "loading" && (
        <LearningLoading>Загружаем подписку…</LearningLoading>
      )}
      {offersResource.status !== "loading" && offers.length === 0 && (
        <Alert tone="neutral">
          Оплата подписки скоро откроется. Пока бесплатна первая глава каждого
          курса.
        </Alert>
      )}
      {charging && (
        <Alert tone="success">
          У вас уже есть подписка.{" "}
          <Link href="/me/subscription">Открыть «Мою подписку»</Link>
        </Alert>
      )}
      {offers.length > 0 && !charging && (
        <Surface>
          <Stack>
            <fieldset className={styles.subscriptionPlans}>
              <legend>Период оплаты</legend>
              {offers.map((offer) => (
                <label
                  key={offer.priceId}
                  className={styles.subscriptionPlan}
                  data-selected={offer.priceId === selected?.priceId}
                >
                  <input
                    type="radio"
                    name="subscription-period"
                    value={offer.priceId}
                    checked={offer.priceId === selected?.priceId}
                    onChange={() => {
                      setChosen(offer.priceId);
                    }}
                  />
                  <span>
                    <strong>{PERIOD_LABEL[offer.billingPeriod]}</strong>
                    {offer.billingPeriod === "year" && (
                      <Badge tone="success">Выгоднее всего</Badge>
                    )}
                  </span>
                  <span>
                    {formatMoney(offer.amountMinor, offer.currency)}{" "}
                    {PERIOD_SUFFIX[offer.billingPeriod]}
                  </span>
                  {offer.billingPeriod !== "month" && (
                    <Text size="sm" muted>
                      {perMonth(
                        offer.amountMinor,
                        offer.currency,
                        offer.billingPeriod
                      )}{" "}
                      в месяц
                    </Text>
                  )}
                </label>
              ))}
            </fieldset>
            <Checkbox
              checked={agreed}
              onChange={(event) => {
                setAgreed(event.target.checked);
              }}
              label={
                <>
                  Согласен на автоматическое продление подписки и передачу моей
                  почты платёжному сервису lava.top (Кипр) на условиях{" "}
                  <Link
                    href="/terms#subscription"
                    target="_blank"
                    rel="noopener"
                  >
                    пользовательского соглашения
                  </Link>
                  . Отменить можно в любой момент.
                </>
              }
            />
            <Button
              loading={busy}
              disabled={!agreed}
              onClick={() => void pay()}
            >
              {anonymous ? "Создать аккаунт и оформить" : "Перейти к оплате"}
            </Button>
            {error && <Alert tone="danger">{error}</Alert>}
            <Text size="sm" muted>
              Оплата картой российского банка или через СБП на странице
              платёжного сервиса lava.top.
            </Text>
          </Stack>
        </Surface>
      )}
      <Link className={buttonClass({ variant: "secondary" })} href="/courses">
        Вернуться к курсам
      </Link>
    </Stack>
  );
}
