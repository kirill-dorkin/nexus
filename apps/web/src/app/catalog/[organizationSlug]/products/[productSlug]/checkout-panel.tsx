"use client";

import {
  identityUserSchema,
  type IdentityUser,
  type PublicCatalogProductResponse
} from "@platform/contracts";
import { useEffect, useRef, useState } from "react";

import { apiError, browserApiRequest } from "../../../../../lib/public-api";
import { attemptKey } from "./checkout/attempt-key";
import { CheckoutAuthForm } from "./checkout/auth-form";
import { PriceList } from "./checkout/price-list";
import { startCheckout } from "./checkout/start-checkout";
import styles from "./product.module.css";

/** Price choice, account and the step to the payment provider for one product. */
export function CheckoutPanel({
  catalog
}: Readonly<{ catalog: PublicCatalogProductResponse }>) {
  const firstPrice = catalog.product.prices[0];
  if (firstPrice === undefined) {
    throw new Error("Public checkout requires at least one active Price.");
  }

  const [selectedPriceId, setSelectedPriceId] = useState(firstPrice.id);
  const [user, setUser] = useState<IdentityUser | null | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const attempts = useRef(new Map<string, string>());

  useEffect(() => {
    const controller = new AbortController();
    void (async () => {
      try {
        const response = await browserApiRequest("/v1/me", {
          signal: controller.signal
        });
        if (controller.signal.aborted) return;
        if (response.status === 401) {
          setUser(null);
          return;
        }
        if (!response.ok) throw await apiError(response);
        setUser(identityUserSchema.parse(await response.json()));
      } catch {
        if (!controller.signal.aborted) {
          setUser(null);
          setStatusMessage(
            "Не удалось проверить текущую сессию. Можно войти повторно."
          );
        }
      }
    })();
    return () => {
      controller.abort();
    };
  }, []);

  async function handleLogout() {
    setBusy(true);
    setErrorMessage(null);
    setStatusMessage(null);
    try {
      const response = await browserApiRequest("/v1/auth/logout", {
        method: "POST"
      });
      if (!response.ok) throw await apiError(response);
      setUser(null);
      setStatusMessage("Вы вышли из аккаунта.");
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Не удалось выйти из аккаунта."
      );
    } finally {
      setBusy(false);
    }
  }

  async function handleCheckout() {
    if (!user) {
      setErrorMessage("Сначала войдите или создайте аккаунт.");
      return;
    }
    setBusy(true);
    setErrorMessage(null);
    setStatusMessage("Проверяем актуальность предложения…");
    try {
      const checkoutUrl = await startCheckout({
        catalog,
        priceId: selectedPriceId,
        attemptKey: (priceId) =>
          attemptKey(
            attempts.current,
            catalog.organization.slug,
            catalog.product.slug,
            priceId
          ),
        onStatus: setStatusMessage,
        onSessionEnded: () => setUser(null)
      });
      setStatusMessage("Переходим к защищённой оплате…");
      window.location.assign(checkoutUrl);
    } catch (error) {
      setStatusMessage(null);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Не удалось начать оплату. Повторите попытку."
      );
    } finally {
      setBusy(false);
    }
  }

  const open = catalog.organization.customerEntryPolicy === "open";
  return (
    <aside className={styles.checkoutCard} aria-labelledby="checkout-heading">
      <div>
        <p className={styles.eyebrow}>Оплата</p>
        <h2 id="checkout-heading">Выберите цену</h2>
      </div>

      <PriceList
        prices={catalog.product.prices}
        selected={selectedPriceId}
        disabled={busy}
        onSelect={setSelectedPriceId}
      />

      <div className={styles.authBox}>
        {user === undefined ? (
          <p className={styles.status}>Проверяем сессию…</p>
        ) : user === null ? (
          <CheckoutAuthForm
            busy={busy}
            onBusy={(next) => {
              setBusy(next);
              if (next) setStatusMessage(null);
            }}
            onSignedIn={(signedIn, message) => {
              setUser(signedIn);
              setStatusMessage(message);
            }}
            onError={setErrorMessage}
          />
        ) : (
          <>
            <div className={styles.sessionRow}>
              <div className={styles.sessionIdentity}>
                <strong>{user.displayName ?? "Аккаунт"}</strong>
                <span>{user.email}</span>
              </div>
              <button
                className={styles.secondaryButton}
                type="button"
                onClick={handleLogout}
                disabled={busy}
              >
                Выйти
              </button>
            </div>
            <div className={styles.divider} />
            <p className={styles.hint}>
              {open
                ? "Организация разрешает самостоятельное вступление. Нажатие кнопки явно подтвердит участие перед оплатой."
                : "Самостоятельное вступление закрыто. Оплата доступна уже активным участникам организации."}
            </p>
            <button
              className={styles.button}
              type="button"
              onClick={handleCheckout}
              disabled={busy}
            >
              {open ? "Присоединиться и перейти к оплате" : "Перейти к оплате"}
            </button>
          </>
        )}
      </div>

      <div aria-live="polite">
        {statusMessage !== null ? (
          <p className={styles.success}>{statusMessage}</p>
        ) : null}
        {errorMessage !== null ? (
          <p className={styles.error} role="alert">
            {errorMessage}
          </p>
        ) : null}
      </div>
    </aside>
  );
}
