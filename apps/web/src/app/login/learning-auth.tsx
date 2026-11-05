"use client";
import { type OAuthProvider } from "@platform/contracts";
import { ForgotPasswordLink } from "./forgot-password-link";
import {
  clientIdentityUserSchema as identityUserSchema,
  clientOAuthProvidersResponseSchema as oauthProvidersResponseSchema
} from "@platform/contracts/client";
import { useEffect, useState, type SubmitEvent } from "react";
import Link from "next/link";
import { browserApiRequest, publicApiUrl } from "../../lib/public-api";
import { safeLearningReturnTo } from "../../lib/learning-return-to";
import {
  ArrowRightIcon,
  GithubLogoIcon,
  GoogleLogoIcon
} from "@phosphor-icons/react/dist/ssr";
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
export function LearningAuth({
  returnTo,
  initialMode = "login",
  externalLoginFailed = false
}: {
  returnTo: string;
  initialMode?: "login" | "register";
  externalLoginFailed?: boolean;
}) {
  const [mode, setMode] = useState<"login" | "register">(initialMode);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState<string | null>(
      externalLoginFailed
        ? "Не удалось завершить вход через выбранный сервис. Попробуйте ещё раз или войдите по почте."
        : null
    );
  const [providers, setProviders] = useState<readonly OAuthProvider[]>([]);

  useEffect(() => {
    const controller = new AbortController();
    void browserApiRequest("/v1/auth/oauth/providers", {
      signal: controller.signal
    })
      .then(async (response) => {
        if (!response.ok) return;
        const result = oauthProvidersResponseSchema.safeParse(
          await response.json()
        );
        if (result.success) setProviders(result.data.providers);
      })
      .catch(() => {
        // Password authentication remains available when provider discovery fails.
      });
    return () => controller.abort();
  }, []);

  function providerUrl(provider: OAuthProvider): string {
    const query = new URLSearchParams({
      returnTo: safeLearningReturnTo(returnTo)
    });
    return publicApiUrl(`/v1/auth/oauth/${provider}/start?${query.toString()}`);
  }
  async function submit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const field = (name: string): string => {
      const value = data.get(name);
      return typeof value === "string" ? value : "";
    };
    const displayName = field("displayName").trim();
    setBusy(true);
    setError(null);
    try {
      const response = await browserApiRequest(`/v1/auth/${mode}`, {
        method: "POST",
        body: JSON.stringify({
          email: field("email"),
          password: field("password"),
          ...(mode === "register" && displayName ? { displayName } : {})
        })
      });
      if (!response.ok) {
        setError(
          response.status === 401
            ? "Проверьте почту и пароль."
            : response.status === 409
              ? "Аккаунт с такой почтой уже существует. Войдите в него."
              : response.status === 429
                ? "Слишком много попыток. Подождите несколько минут и попробуйте снова."
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
        <button
          type="button"
          aria-pressed={mode === "login"}
          disabled={busy}
          onClick={() => changeMode("login")}
        >
          Вход
        </button>
        <button
          type="button"
          aria-pressed={mode === "register"}
          disabled={busy}
          onClick={() => changeMode("register")}
        >
          Регистрация
        </button>
      </div>
      {providers.length > 0 && (
        <div className={styles.external} aria-label="Вход через другой сервис">
          <div className={styles.providerGrid}>
            {providers.includes("google") && (
              <a className={styles.providerButton} href={providerUrl("google")}>
                <GoogleLogoIcon size={21} weight="bold" aria-hidden="true" />
                <span>
                  {mode === "login" ? "Войти" : "Продолжить"} через Google
                </span>
              </a>
            )}
            {providers.includes("github") && (
              <a className={styles.providerButton} href={providerUrl("github")}>
                <GithubLogoIcon size={21} weight="fill" aria-hidden="true" />
                <span>
                  {mode === "login" ? "Войти" : "Продолжить"} через GitHub
                </span>
              </a>
            )}
          </div>
          <div className={styles.separator}>
            <span>или по электронной почте</span>
          </div>
        </div>
      )}
      <form className={styles.authForm} onSubmit={submit} aria-busy={busy}>
        {error && <Alert tone="danger">{error}</Alert>}
        <fieldset
          disabled={busy}
          aria-label={
            mode === "login" ? "Данные для входа" : "Данные нового аккаунта"
          }
        >
          {mode === "register" && (
            <div key="name" className={styles.nameField}>
              <Field htmlFor="learning-name" label="Имя" hint="Необязательно">
                <Input
                  id="learning-name"
                  name="displayName"
                  autoComplete="name"
                  maxLength={160}
                  aria-describedby="learning-name-hint"
                />
              </Field>
            </div>
          )}
          <Field key="email" htmlFor="learning-email" label="Электронная почта">
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
            key="password"
            htmlFor="learning-password"
            label="Пароль"
            hint={mode === "register" ? "Не менее 15 символов." : undefined}
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
          {mode === "login" && <ForgotPasswordLink />}
        </fieldset>
        <div className={styles.actions}>
          <Button loading={busy} type="submit">
            {busy
              ? "Подождите…"
              : mode === "login"
                ? "Войти"
                : "Создать аккаунт"}
            {!busy && <ArrowRightIcon size={20} aria-hidden="true" />}
          </Button>
          <div className={styles.alternative}>
            <span>
              {mode === "login" ? "Нет аккаунта?" : "Уже зарегистрированы?"}
            </span>
            <button
              type="button"
              disabled={busy}
              onClick={() =>
                changeMode(mode === "login" ? "register" : "login")
              }
            >
              {mode === "login"
                ? "Создать новый аккаунт"
                : "У меня уже есть аккаунт"}
            </button>
          </div>
        </div>
      </form>
      <Link className={styles.authReturn} href={safeLearningReturnTo(returnTo)}>
        Вернуться
      </Link>
    </section>
  );
}
