"use client";
import { identityUserSchema } from "@platform/contracts";
import { useState, type FormEvent } from "react";
import Link from "next/link";
import { browserApiRequest } from "../../lib/public-api";
import { safeLearningReturnTo } from "../../lib/learning-return-to";
import { ArrowRight } from "@phosphor-icons/react/dist/ssr";
import {
  Alert,
  Button,
  Field,
  Heading,
  Input,
  PasswordInput,
  Text
} from "@platform/ui";
import styles from "./auth.module.css";
export function LearningAuth({ returnTo, initialMode = "login" }: { returnTo: string; initialMode?: "login" | "register" }) {
  const [mode, setMode] = useState<"login" | "register">(initialMode);
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
              : mode === "login"
                ? "Не удалось войти. Проверьте данные и попробуйте снова."
                : "Не удалось создать аккаунт. Проверьте данные и попробуйте снова."
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
  function changeMode(next: "login" | "register") {
    if (busy) return;
    setMode(next);
    setError(null);
  }
  return (
    <section className={styles.authLayout} aria-labelledby="auth-title">
      <div className={styles.intro}>
        <Heading level={1} size="section" id="auth-title">
          {mode === "login" ? "С возвращением." : "Начнём обучение."}
        </Heading>
        <Text muted>
          {mode === "login"
            ? "Войдите, чтобы продолжить обучение."
            : "Создайте аккаунт, чтобы сохранять результаты практики."}
        </Text>
      </div>
      <div className={styles.modes} aria-label="Вход или регистрация">
        <button type="button" aria-pressed={mode === "login"} disabled={busy}
          onClick={() => changeMode("login")}>Вход</button>
        <button type="button" aria-pressed={mode === "register"} disabled={busy}
          onClick={() => changeMode("register")}>Регистрация</button>
      </div>
      <form className={styles.authForm} onSubmit={submit} aria-busy={busy}>
        {error && <Alert tone="danger">{error}</Alert>}
        <fieldset disabled={busy} aria-label={mode === "login" ? "Данные для входа" : "Данные нового аккаунта"}>
          {mode === "register" && (
            <div key="name" className={styles.nameField}>
              <Field htmlFor="learning-name" label="Имя" hint="Необязательно">
                <Input id="learning-name" name="displayName" autoComplete="name" maxLength={160}
                  aria-describedby="learning-name-hint" />
              </Field>
            </div>
          )}
          <Field key="email" htmlFor="learning-email" label="Электронная почта">
            <Input id="learning-email" name="email" type="email" autoComplete="email" required maxLength={320} />
          </Field>
          <Field key="password" htmlFor="learning-password" label="Пароль"
            hint={mode === "register" ? "Не менее 15 символов." : undefined}>
            <PasswordInput id="learning-password" name="password"
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              required minLength={15} maxLength={128}
              aria-describedby={mode === "register" ? "learning-password-hint" : undefined} />
          </Field>
        </fieldset>
        <div className={styles.actions}>
          <Button loading={busy} type="submit">
            {busy ? "Подождите…" : mode === "login" ? "Войти" : "Создать аккаунт"}
            {!busy && <ArrowRight size={20} aria-hidden="true" />}
          </Button>
          <div className={styles.alternative}>
            <span>{mode === "login" ? "Нет аккаунта?" : "Уже зарегистрированы?"}</span>
            <button type="button" disabled={busy}
              onClick={() => changeMode(mode === "login" ? "register" : "login")}>
              {mode === "login" ? "Создать новый аккаунт" : "У меня уже есть аккаунт"}
            </button>
          </div>
        </div>
      </form>
      <Link className={styles.authReturn} href={safeLearningReturnTo(returnTo)}>Вернуться</Link>
    </section>
  );
}
