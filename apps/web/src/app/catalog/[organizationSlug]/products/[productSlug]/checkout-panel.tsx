"use client";

import {
  identityUserSchema,
  publicCatalogProductResponseSchema,
  publicPurchaseCheckoutSchema,
  uuidSchema,
  type IdentityUser,
  type PublicCatalogProductResponse
} from "@platform/contracts";
import { type SubmitEvent, useEffect, useRef, useState } from "react";

import {
  apiError,
  browserApiRequest,
  PublicApiError
} from "../../../../../lib/public-api";
import styles from "./product.module.css";

type AuthMode = "login" | "register";

type CheckoutPanelProps = Readonly<{
  catalog: PublicCatalogProductResponse;
}>;

function formatMoney(amountMinor: number, currency: string): string {
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency
  }).format(amountMinor / 100);
}

function checkoutStorageKey(
  organizationSlug: string,
  productSlug: string,
  priceId: string
): string {
  return `checkout-attempt:${organizationSlug}:${productSlug}:${priceId}`;
}

export function CheckoutPanel({ catalog }: CheckoutPanelProps) {
  const firstPrice = catalog.product.prices[0];
  if (firstPrice === undefined) {
    throw new Error("Public checkout requires at least one active Price.");
  }

  const [selectedPriceId, setSelectedPriceId] = useState(firstPrice.id);
  const [user, setUser] = useState<IdentityUser | null | undefined>(undefined);
  const [authMode, setAuthMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [busy, setBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const runtimeAttemptKeys = useRef(new Map<string, string>());

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
        if (!response.ok) {
          throw await apiError(response);
        }
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

  function attemptKey(priceId: string): string {
    const storageKey = checkoutStorageKey(
      catalog.organization.slug,
      catalog.product.slug,
      priceId
    );
    const runtime = runtimeAttemptKeys.current.get(storageKey);
    if (runtime !== undefined) return runtime;

    try {
      const stored = window.sessionStorage.getItem(storageKey);
      if (stored !== null && uuidSchema.safeParse(stored).success) {
        runtimeAttemptKeys.current.set(storageKey, stored);
        return stored;
      }
    } catch {
      // Runtime memory below still preserves retry idempotency for this page life.
    }

    const created = crypto.randomUUID();
    runtimeAttemptKeys.current.set(storageKey, created);
    try {
      window.sessionStorage.setItem(storageKey, created);
    } catch {
      // Storage can be unavailable in privacy modes; runtime memory is sufficient.
    }
    return created;
  }

  async function handleAuth(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setErrorMessage(null);
    setStatusMessage(null);

    try {
      const endpoint =
        authMode === "login" ? "/v1/auth/login" : "/v1/auth/register";
      const payload =
        authMode === "login"
          ? { email, password }
          : {
              email,
              password,
              ...(displayName.trim().length > 0
                ? { displayName: displayName.trim() }
                : {})
            };
      const response = await browserApiRequest(endpoint, {
        method: "POST",
        body: JSON.stringify(payload)
      });
      if (!response.ok) {
        throw await apiError(response);
      }

      const authenticated = identityUserSchema.parse(await response.json());
      setUser(authenticated);
      setPassword("");
      setStatusMessage(
        authMode === "login" ? "Вы вошли в аккаунт." : "Аккаунт создан."
      );
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Не удалось выполнить вход."
      );
    } finally {
      setBusy(false);
    }
  }

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

  async function currentProduct(): Promise<PublicCatalogProductResponse> {
    const response = await browserApiRequest(
      `/v1/public/catalog/${encodeURIComponent(catalog.organization.slug)}/products/${encodeURIComponent(catalog.product.slug)}`
    );
    if (!response.ok) throw await apiError(response);
    return publicCatalogProductResponseSchema.parse(await response.json());
  }

  async function handleCheckout() {
    if (user === null || user === undefined) {
      setErrorMessage("Сначала войдите или создайте аккаунт.");
      return;
    }

    setBusy(true);
    setErrorMessage(null);
    setStatusMessage("Проверяем актуальность предложения…");

    try {
      const fresh = await currentProduct();
      const selectedPrice = fresh.product.prices.find(
        (price) => price.id === selectedPriceId
      );
      if (selectedPrice === undefined) {
        throw new PublicApiError(
          409,
          "Выбранная цена больше недоступна. Обновите страницу и выберите актуальную цену."
        );
      }

      if (fresh.organization.customerEntryPolicy === "open") {
        setStatusMessage("Подтверждаем участие в организации…");
        const entry = await browserApiRequest(
          `/v1/public/organizations/${encodeURIComponent(fresh.organization.slug)}/memberships/me`,
          { method: "POST" }
        );
        if (entry.status === 401) {
          setUser(null);
          throw new PublicApiError(401, "Сессия завершилась. Войдите снова.");
        }
        if (entry.status === 409) {
          throw new PublicApiError(
            409,
            "Текущее состояние участия нельзя изменить через публичный вход."
          );
        }
        if (!entry.ok && entry.status !== 404) {
          throw await apiError(entry);
        }
        // A 404 can mean that open entry closed after the fresh read. Checkout is
        // still attempted because an already-active member remains authorized.
      }

      const idempotencyKey = attemptKey(selectedPrice.id);
      setStatusMessage("Создаём защищённую сессию оплаты…");
      const checkoutResponse = await browserApiRequest(
        `/v1/public/catalog/${encodeURIComponent(fresh.organization.slug)}/products/${encodeURIComponent(fresh.product.slug)}/checkout`,
        {
          method: "POST",
          body: JSON.stringify({
            priceId: selectedPrice.id,
            idempotencyKey
          })
        }
      );

      if (checkoutResponse.status === 401) {
        setUser(null);
        throw new PublicApiError(401, "Сессия завершилась. Войдите снова.");
      }
      if (checkoutResponse.status === 404) {
        throw new PublicApiError(
          404,
          "Покупка сейчас недоступна. Проверьте участие в организации и актуальность предложения."
        );
      }
      if (checkoutResponse.status === 409) {
        throw new PublicApiError(
          409,
          "Состояние покупки изменилось. Обновите страницу перед новой попыткой."
        );
      }
      if (!checkoutResponse.ok) {
        throw await apiError(checkoutResponse);
      }

      const checkout = publicPurchaseCheckoutSchema.parse(
        await checkoutResponse.json()
      );
      setStatusMessage("Переходим к защищённой оплате…");
      window.location.assign(checkout.checkoutUrl);
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

  return (
    <aside className={styles.checkoutCard} aria-labelledby="checkout-heading">
      <div>
        <p className={styles.eyebrow}>Оплата</p>
        <h2 id="checkout-heading">Выберите цену</h2>
      </div>

      <fieldset className={styles.priceList} disabled={busy}>
        <legend className={styles.eyebrow}>Доступные варианты</legend>
        {catalog.product.prices.map((price) => (
          <label className={styles.priceOption} key={price.id}>
            <input
              type="radio"
              name="price"
              value={price.id}
              checked={selectedPriceId === price.id}
              onChange={() => setSelectedPriceId(price.id)}
            />
            <span>
              <span className={styles.priceValue}>
                {formatMoney(price.amountMinor, price.currency)}
              </span>
              <span className={styles.hint}>Разовая оплата</span>
            </span>
          </label>
        ))}
      </fieldset>

      <div className={styles.authBox}>
        {user === undefined ? (
          <p className={styles.status}>Проверяем сессию…</p>
        ) : user === null ? (
          <>
            <div className={styles.authTabs} aria-label="Способ входа">
              <button
                className={styles.tabButton}
                type="button"
                aria-pressed={authMode === "login"}
                onClick={() => setAuthMode("login")}
                disabled={busy}
              >
                Войти
              </button>
              <button
                className={styles.tabButton}
                type="button"
                aria-pressed={authMode === "register"}
                onClick={() => setAuthMode("register")}
                disabled={busy}
              >
                Регистрация
              </button>
            </div>

            <form className={styles.form} onSubmit={handleAuth}>
              <label className={styles.field}>
                Email
                <input
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                  maxLength={320}
                />
              </label>

              {authMode === "register" ? (
                <label className={styles.field}>
                  Имя
                  <input
                    type="text"
                    autoComplete="name"
                    value={displayName}
                    onChange={(event) => setDisplayName(event.target.value)}
                    maxLength={160}
                  />
                </label>
              ) : null}

              <label className={styles.field}>
                Пароль
                <input
                  type="password"
                  autoComplete={
                    authMode === "login" ? "current-password" : "new-password"
                  }
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  minLength={15}
                  maxLength={128}
                />
              </label>

              <button className={styles.button} type="submit" disabled={busy}>
                {authMode === "login" ? "Войти" : "Создать аккаунт"}
              </button>
            </form>
          </>
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
              {catalog.organization.customerEntryPolicy === "open"
                ? "Организация разрешает самостоятельное вступление. Нажатие кнопки явно подтвердит участие перед оплатой."
                : "Самостоятельное вступление закрыто. Оплата доступна уже активным участникам организации."}
            </p>

            <button
              className={styles.button}
              type="button"
              onClick={handleCheckout}
              disabled={busy}
            >
              {catalog.organization.customerEntryPolicy === "open"
                ? "Присоединиться и перейти к оплате"
                : "Перейти к оплате"}
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
