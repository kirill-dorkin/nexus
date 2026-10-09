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
  Eyebrow,
  Field,
  Heading,
  Input,
  PasswordInput,
  Stack,
  Surface,
  Text
} from "@platform/ui";
import styles from "./auth.module.css";
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
  return (
    <div className={styles.authLayout}>
      <aside className={styles.authIntro} aria-label="Обучение с аккаунтом">
        <Eyebrow>От понимания к практике</Eyebrow>
        <Heading level={2} size="section">
          Продолжайте с того места, где остановились.
        </Heading>
        <Text muted>
          Материалы доступны без аккаунта. Войдите, чтобы записаться на курс и
          сохранять результаты заданий.
        </Text>
        <ol>
          <li>
            <span>01</span>
            <div>
              <strong>Ваши курсы — рядом</strong>
              <Text muted size="sm">
                Возвращайтесь к ним в «Моём обучении».
              </Text>
            </div>
          </li>
          <li>
            <span>02</span>
            <div>
              <strong>Практика с обратной связью</strong>
              <Text muted size="sm">
                После записи отправляйте ответы и смотрите результат.
              </Text>
            </div>
          </li>
          <li>
            <span>03</span>
            <div>
              <strong>Удобное вам оформление</strong>
              <Text muted size="sm">
                Светлая или тёмная тема и выбранный цвет на этом устройстве.
              </Text>
            </div>
          </li>
        </ol>
      </aside>
      <section aria-labelledby="auth-title">
        <Surface appearance="solid" className={styles.authCard} padding="lg">
          <Stack gap="md" className={styles.authContent}>
            <Stack gap="sm">
              <Eyebrow>Ваш аккаунт</Eyebrow>
              <Heading level={1} size="section" id="auth-title">
                {mode === "login" ? "Вход" : "Регистрация"}
              </Heading>
              <Text muted size="sm">
                {mode === "login"
                  ? "Рады видеть вас снова. Войдите, чтобы продолжить."
                  : "Создайте аккаунт и возвращайтесь к своей практике."}
              </Text>
            </Stack>
            <form onSubmit={submit} aria-busy={busy}>
              {error && <Alert tone="danger">{error}</Alert>}
              <fieldset
                disabled={busy}
                aria-label={
                  mode === "login"
                    ? "Данные для входа"
                    : "Данные нового аккаунта"
                }
              >
                {mode === "register" && (
                  <Field
                    htmlFor="learning-name"
                    label="Имя"
                    hint="Необязательно"
                  >
                    <Input
                      id="learning-name"
                      name="displayName"
                      autoComplete="name"
                      maxLength={160}
                      aria-describedby="learning-name-hint"
                    />
                  </Field>
                )}
                <Field htmlFor="learning-email" label="Электронная почта">
                  <Input
                    id="learning-email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    maxLength={320}
                  />
                </Field>
                <Field
                  htmlFor="learning-password"
                  label="Пароль"
                  hint={
                    mode === "register" ? "Не менее 15 символов." : undefined
                  }
                >
                  <PasswordInput
                    id="learning-password"
                    name="password"
                    autoComplete={
                      mode === "login" ? "current-password" : "new-password"
                    }
                    required
                    minLength={15}
                    maxLength={128}
                    aria-describedby={
                      mode === "register" ? "learning-password-hint" : undefined
                    }
                  />
                </Field>
              </fieldset>
              <Button loading={busy} type="submit">
                {busy
                  ? "Подождите…"
                  : mode === "login"
                    ? "Войти"
                    : "Создать аккаунт"}
                {!busy && <ArrowRight size={18} aria-hidden="true" />}
              </Button>
            </form>
            <Button
              variant="ghost"
              disabled={busy}
              onClick={() => {
                setMode(mode === "login" ? "register" : "login");
                setError(null);
              }}
            >
              {mode === "login"
                ? "Создать новый аккаунт"
                : "У меня уже есть аккаунт"}
            </Button>
            <Link
              className={styles.authReturn}
              href={safeLearningReturnTo(returnTo)}
            >
              Вернуться
            </Link>
          </Stack>
        </Surface>
      </section>
    </div>
  );
}
