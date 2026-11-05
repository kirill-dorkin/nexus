"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import {
  Alert,
  Button,
  Field,
  Heading,
  Input,
  PasswordInput,
  Text
} from "@platform/ui";
import { browserApiRequest } from "../../lib/public-api";
import styles from "./auth.module.css";

const TOKEN = /^[A-Za-z0-9_-]{43}$/;

function failure(status: number | null): string {
  if (status === 429) return "Слишком много попыток. Попробуйте через час.";
  if (status === null)
    return "Нет связи с сервером. Проверьте интернет и попробуйте ещё раз.";
  return "Не получилось. Попробуйте ещё раз чуть позже.";
}

/** Asks for a reset link; the answer is the same whether the account exists. */
export function PasswordResetRequestForm() {
  const [state, setState] = useState<"editing" | "sending" | "sent">("editing");
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const email = String(new FormData(event.currentTarget).get("email") ?? "");
    setState("sending");
    setError(null);
    try {
      const response = await browserApiRequest(
        "/v1/auth/password-reset/request",
        { method: "POST", body: JSON.stringify({ email: email.trim() }) }
      );
      if (response.status === 202) {
        setState("sent");
        return;
      }
      setError(failure(response.status));
    } catch {
      setError(failure(null));
    }
    setState("editing");
  }

  return (
    <section className={styles.authLayout} aria-labelledby="reset-title">
      <div className={styles.intro}>
        <Heading level={1} size="section" id="reset-title">
          Забыли пароль?
        </Heading>
        <Text muted>
          Укажите почту аккаунта, и мы пришлём ссылку для нового пароля.
        </Text>
      </div>
      {state === "sent" ? (
        <Alert tone="success" title="Проверьте почту">
          Если аккаунт с этой почтой есть, письмо со ссылкой уже в пути. Ссылка
          действует 30 минут. Письма нет — загляните в «Спам».
        </Alert>
      ) : (
        <form
          className={styles.authForm}
          onSubmit={(event) => void submit(event)}
          aria-busy={state === "sending"}
        >
          {error && <Alert tone="danger">{error}</Alert>}
          <fieldset disabled={state === "sending"} aria-label="Почта аккаунта">
            <Field htmlFor="reset-email" label="Электронная почта">
              <Input
                id="reset-email"
                name="email"
                type="email"
                autoComplete="email"
                required
                maxLength={320}
              />
            </Field>
          </fieldset>
          <div className={styles.actions}>
            <Button type="submit" loading={state === "sending"}>
              Прислать ссылку
            </Button>
          </div>
        </form>
      )}
      <Link className={styles.authReturn} href="/login">
        Вернуться ко входу
      </Link>
    </section>
  );
}

/** Sets a new password with the token from the link's fragment. */
export function PasswordResetConfirmForm() {
  const [token, setToken] = useState<string | null | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const value = new URLSearchParams(window.location.hash.slice(1)).get(
      "token"
    );
    // The token never stays in the address bar, history or a shared link.
    if (window.location.hash)
      window.history.replaceState(null, "", window.location.pathname);
    setToken(value && TOKEN.test(value) ? value : null);
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const password = String(
      new FormData(event.currentTarget).get("password") ?? ""
    );
    setBusy(true);
    setError(null);
    try {
      const response = await browserApiRequest(
        "/v1/auth/password-reset/confirm",
        { method: "POST", body: JSON.stringify({ token, password }) }
      );
      if (response.ok) {
        window.location.assign("/me/learning");
        return;
      }
      if (response.status === 400) setToken(null);
      else setError(failure(response.status));
    } catch {
      setError(failure(null));
    }
    setBusy(false);
  }

  return (
    <section className={styles.authLayout} aria-labelledby="new-password-title">
      <div className={styles.intro}>
        <Heading level={1} size="section" id="new-password-title">
          Новый пароль
        </Heading>
        <Text muted>
          После смены пароля мы выйдем из аккаунта на других устройствах.
        </Text>
      </div>
      {token === null ? (
        <Alert tone="warning" title="Ссылка недействительна или устарела">
          Ссылка работает один раз и 30 минут.{" "}
          <Link href="/forgot-password">Запросите новую</Link>.
        </Alert>
      ) : (
        <form
          className={styles.authForm}
          onSubmit={(event) => void submit(event)}
          aria-busy={busy}
        >
          {error && <Alert tone="danger">{error}</Alert>}
          <fieldset
            disabled={busy || token === undefined}
            aria-label="Новый пароль"
          >
            <Field
              htmlFor="new-password"
              label="Новый пароль"
              hint="Не менее 15 символов."
            >
              <PasswordInput
                id="new-password"
                name="password"
                autoComplete="new-password"
                required
                minLength={15}
                maxLength={128}
                aria-describedby="new-password-hint"
              />
            </Field>
          </fieldset>
          <div className={styles.actions}>
            <Button type="submit" loading={busy}>
              Сохранить и войти
            </Button>
          </div>
        </form>
      )}
    </section>
  );
}
