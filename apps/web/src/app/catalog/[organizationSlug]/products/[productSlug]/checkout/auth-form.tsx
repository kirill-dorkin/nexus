"use client";
import { useState, type SubmitEvent } from "react";
import { apiError, browserApiRequest } from "../../../../../../lib/public-api";
import {
  currentRegistrationConsents,
  identityUserSchema,
  type IdentityUser
} from "@platform/contracts";
import { RegistrationConsents } from "../../../../../../components/legal/registration-consents";
import styles from "../product.module.css";

type AuthMode = "login" | "register";

/** Sign-in or registration inside the checkout panel, without leaving the product page. */
export function CheckoutAuthForm({
  busy,
  onBusy,
  onSignedIn,
  onError
}: {
  busy: boolean;
  onBusy: (busy: boolean) => void;
  onSignedIn: (user: IdentityUser, message: string) => void;
  onError: (message: string | null) => void;
}) {
  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");

  async function submit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    onBusy(true);
    onError(null);
    try {
      const name = displayName.trim();
      const response = await browserApiRequest(
        mode === "login" ? "/v1/auth/login" : "/v1/auth/register",
        {
          method: "POST",
          body: JSON.stringify(
            mode === "login"
              ? { email, password }
              : {
                  email,
                  password,
                  ...(name ? { displayName: name } : {}),
                  consents: currentRegistrationConsents()
                }
          )
        }
      );
      if (!response.ok) throw await apiError(response);
      const user = identityUserSchema.parse(await response.json());
      setPassword("");
      onSignedIn(
        user,
        mode === "login" ? "Вы вошли в аккаунт." : "Аккаунт создан."
      );
    } catch (error) {
      onError(
        error instanceof Error ? error.message : "Не удалось выполнить вход."
      );
    } finally {
      onBusy(false);
    }
  }

  return (
    <>
      <div className={styles.authTabs} aria-label="Способ входа">
        {(
          [
            ["login", "Войти"],
            ["register", "Регистрация"]
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            className={styles.tabButton}
            type="button"
            aria-pressed={mode === value}
            onClick={() => setMode(value)}
            disabled={busy}
          >
            {label}
          </button>
        ))}
      </div>
      <form className={styles.form} onSubmit={submit}>
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
        {mode === "register" ? (
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
              mode === "login" ? "current-password" : "new-password"
            }
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            minLength={15}
            maxLength={128}
          />
        </label>
        {mode === "register" ? <RegistrationConsents disabled={busy} /> : null}
        <button className={styles.button} type="submit" disabled={busy}>
          {mode === "login" ? "Войти" : "Создать аккаунт"}
        </button>
      </form>
    </>
  );
}
