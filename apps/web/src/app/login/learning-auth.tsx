"use client";
import { identityUserSchema } from "@platform/contracts";
import { useState, type FormEvent } from "react";
import Link from "next/link";
import { browserApiRequest } from "../../lib/public-api";
import { safeLearningReturnTo } from "../../lib/learning-return-to";
import styles from "../../components/learning/learning.module.css";
export function LearningAuth({ returnTo }: { returnTo: string }) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [busy, setBusy] = useState(false),
    [error, setError] = useState<string | null>(null);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setBusy(true);
    setError(null);
    try {
      const response = await browserApiRequest(`/v1/auth/${mode}`, {
        method: "POST",
        body: JSON.stringify({
          email: data.get("email"),
          password: data.get("password"),
          ...(mode === "register" &&
          String(data.get("displayName") ?? "").trim()
            ? { displayName: String(data.get("displayName")).trim() }
            : {})
        })
      });
      if (!response.ok) {
        setError(
          response.status === 401
            ? "Проверьте почту и пароль."
            : response.status === 409
              ? "Аккаунт с такой почтой уже существует. Войдите в него."
              : "Не удалось войти. Проверьте данные и попробуйте снова."
        );
        return;
      }
      identityUserSchema.parse(await response.json());
      window.location.assign(safeLearningReturnTo(returnTo));
    } catch {
      setError("Не удалось связаться с сервером. Попробуйте снова.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className={styles.authCard}>
      <p className={styles.eyebrow}>Ваш аккаунт</p>
      <h1>{mode === "login" ? "Вход" : "Регистрация"}</h1>
      <p>После входа вы вернётесь на выбранную страницу.</p>
      <form onSubmit={submit} aria-busy={busy}>
        {mode === "register" && (
          <label htmlFor="learning-name">
            Имя
            <input
              id="learning-name"
              name="displayName"
              autoComplete="name"
              maxLength={160}
            />
          </label>
        )}
        <label htmlFor="learning-email">
          Электронная почта
          <input
            id="learning-email"
            name="email"
            type="email"
            autoComplete="email"
            required
            maxLength={320}
          />
        </label>
        <label htmlFor="learning-password">
          Пароль
          <input
            id="learning-password"
            name="password"
            type="password"
            autoComplete={
              mode === "login" ? "current-password" : "new-password"
            }
            required
            minLength={15}
            maxLength={128}
          />
        </label>
        {mode === "register" && (
          <p className={styles.muted}>Не менее 15 символов.</p>
        )}
        <button className={styles.button} disabled={busy} type="submit">
          {busy ? "Подождите…" : mode === "login" ? "Войти" : "Создать аккаунт"}
        </button>
      </form>
      {error && <p role="alert">{error}</p>}
      <button
        className={styles.secondaryButton}
        type="button"
        disabled={busy}
        onClick={() => {
          setMode(mode === "login" ? "register" : "login");
          setError(null);
        }}
      >
        {mode === "login" ? "Создать новый аккаунт" : "У меня уже есть аккаунт"}
      </button>
      <Link href={safeLearningReturnTo(returnTo)}>Вернуться</Link>
    </section>
  );
}
