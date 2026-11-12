"use client";
import type { OwnSubscription } from "@platform/contracts";
import { clientOwnSubscriptionSchema } from "@platform/contracts/client";
import {
  Alert,
  Badge,
  Button,
  Stack,
  Surface,
  Text,
  buttonClass
} from "@platform/ui";
import Link from "next/link";
import { useEffect, useState } from "react";

import { LearningLoading } from "../../../components/learning/learning-loading";
import { LearningPageHeading } from "../../../components/learning/learning-page-heading";
import { useApiResource } from "../../../lib/hooks/api-resource";
import { learningLoginUrl } from "../../../lib/learning-return-to";
import { browserApiRequest } from "../../../lib/public-api";
import { HOME_ORGANIZATION_SLUG } from "../../../lib/public-learning-routes";
import {
  PERIOD_SUFFIX,
  formatDate,
  formatMoney
} from "../../../lib/subscription-format";

const STATUS: Record<
  NonNullable<OwnSubscription["subscription"]>["status"],
  { label: string; tone: "success" | "warning" | "neutral" | "danger" }
> = {
  pending: { label: "Ждём оплату", tone: "neutral" },
  active: { label: "Активна", tone: "success" },
  past_due: { label: "Не прошло списание", tone: "warning" },
  cancelled: { label: "Отменена", tone: "neutral" },
  revoked: { label: "Закрыта", tone: "danger" }
};

/** «Моя подписка»: status, the paid period and cancellation in one click (ADR-0087 §7). */
export function MySubscription() {
  const path = `/v1/me/subscriptions/${HOME_ORGANIZATION_SLUG}`;
  const [version, setVersion] = useState(0);
  const [resource, setResource] = useApiResource(
    path,
    clientOwnSubscriptionSchema,
    version
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const data = resource.status === "ready" ? resource.data : null;
  const subscription = data?.subscription ?? null;

  // Back from the payment page the webhook may still be on its way: look again a few times.
  const [polls, setPolls] = useState(0);
  useEffect(() => {
    if (resource.status !== "ready" || subscription !== null || polls >= 6)
      return;
    if (!new URLSearchParams(window.location.search).size) return;
    const id = window.setTimeout(() => {
      setPolls((n) => n + 1);
      setVersion((n) => n + 1);
    }, 5_000);
    return () => {
      window.clearTimeout(id);
    };
  }, [resource.status, subscription, polls]);

  async function cancel() {
    if (
      busy ||
      !window.confirm(
        "Отменить подписку? Новых списаний не будет, доступ сохранится до конца оплаченного периода."
      )
    )
      return;
    setBusy(true);
    setError(null);
    try {
      const response = await browserApiRequest(
        `/v1/me/subscriptions/${HOME_ORGANIZATION_SLUG}/cancel`,
        { method: "POST", body: "{}" }
      );
      if (!response.ok) throw new Error(String(response.status));
      setResource({
        status: "ready",
        data: clientOwnSubscriptionSchema.parse(await response.json())
      });
    } catch {
      setError("Не удалось отменить подписку. Попробуйте ещё раз.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Stack>
      <LearningPageHeading
        eyebrow="Аккаунт"
        title="Моя подписка"
        description="Оплата, следующий период и отмена."
      />
      {resource.status === "loading" && (
        <LearningLoading>Загружаем подписку…</LearningLoading>
      )}
      {resource.status === "anonymous" && (
        <Link
          className={buttonClass()}
          href={learningLoginUrl("/me/subscription")}
        >
          Войти
        </Link>
      )}
      {resource.status === "error" && (
        <Alert tone="neutral">
          Подписки пока нет.{" "}
          <Link href="/subscription">Посмотреть варианты</Link>
        </Alert>
      )}
      {data && subscription === null && (
        <Surface>
          <Stack>
            <Text>
              {data.access.access === "trial" && data.access.until
                ? `Сейчас открыт пробный доступ до ${formatDate(data.access.until)}.`
                : "Подписки нет. Бесплатна первая глава каждого курса."}
            </Text>
            {polls > 0 && polls < 6 && (
              <Text size="sm" muted>
                Проверяем оплату — обычно это занимает до минуты…
              </Text>
            )}
            <Link className={buttonClass()} href="/subscription">
              Оформить подписку
            </Link>
          </Stack>
        </Surface>
      )}
      {subscription && (
        <Surface>
          <Stack>
            <Badge tone={STATUS[subscription.status].tone}>
              {STATUS[subscription.status].label}
            </Badge>
            <Text>
              {formatMoney(subscription.amountMinor, subscription.currency)}{" "}
              {PERIOD_SUFFIX[subscription.billingPeriod]}
            </Text>
            {subscription.currentPeriodEnd && (
              <Text>
                {subscription.status === "active"
                  ? `Следующее списание — ${formatDate(subscription.currentPeriodEnd)}.`
                  : subscription.status === "revoked"
                    ? "Доступ закрыт."
                    : `Доступ открыт до ${formatDate(subscription.currentPeriodEnd)}.`}
              </Text>
            )}
            {subscription.status === "past_due" && (
              <Alert tone="warning">
                Не получилось списать оплату. Платёжный сервис попробует ещё
                раз; проверьте, что на карте есть деньги.
              </Alert>
            )}
            {(subscription.status === "active" ||
              subscription.status === "past_due") && (
              <Button
                variant="secondary"
                loading={busy}
                onClick={() => void cancel()}
              >
                Отменить подписку
              </Button>
            )}
            {(subscription.status === "cancelled" ||
              subscription.status === "revoked") && (
              <Link className={buttonClass()} href="/subscription">
                Оформить снова
              </Link>
            )}
            {error && <Alert tone="danger">{error}</Alert>}
          </Stack>
        </Surface>
      )}
    </Stack>
  );
}
