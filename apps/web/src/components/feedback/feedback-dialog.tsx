"use client";

import { clientCreateFeedbackReportRequestSchema } from "@platform/contracts/client";
import {
  Alert,
  Button,
  Dialog,
  Field,
  RadioGroup,
  Textarea
} from "@platform/ui";
import { usePathname } from "next/navigation";
import { useId, useState, type FormEvent } from "react";
import { browserApiRequest } from "../../lib/public-api";
import { HOME_ORGANIZATION_SLUG } from "../../lib/public-learning-routes";
import styles from "./feedback.module.css";

type Kind = "problem" | "unclear" | "idea";
type State =
  | { phase: "editing"; error?: string }
  | { phase: "sending" }
  | { phase: "sent" };

const KINDS = [
  { value: "problem", label: "Что-то не работает" },
  { value: "unclear", label: "Непонятно объяснено" },
  { value: "idea", label: "Идея или пожелание" }
] as const;

const TEXT_LABEL: Record<Kind, string> = {
  problem: "Что случилось?",
  unclear: "Что именно непонятно?",
  idea: "Расскажите идею"
};

/** The Organization of the page: `/learn/{organization}/…`, otherwise the home one. */
export function feedbackOrganizationSlug(pathname: string): string {
  const [first, second] = pathname.split("/").filter(Boolean);
  return first === "learn" && second ? second : HOME_ORGANIZATION_SLUG;
}

/** Pathname without query or fragment, cut to the contract limit. */
function reportPath(pathname: string): string {
  const clean = pathname.split(/[?#]/)[0] ?? "/";
  return /^\/[A-Za-z0-9._~%/-]*$/.test(clean) ? clean.slice(0, 300) : "/";
}

function device(): "mobile" | "desktop" | undefined {
  if (typeof window === "undefined" || !window.matchMedia) return undefined;
  return window.matchMedia("(max-width: 720px)").matches ? "mobile" : "desktop";
}

const optional = (value: FormDataEntryValue | null) => {
  const text = typeof value === "string" ? value.trim() : "";
  return text.length > 0 ? text : undefined;
};

/** Feedback form in a modal dialog (ADR-0085). */
export function FeedbackDialog({
  open,
  onClose
}: {
  open: boolean;
  onClose: () => void;
}) {
  const id = useId();
  const pathname = usePathname() ?? "/";
  const [kind, setKind] = useState<Kind>("problem");
  const [state, setState] = useState<State>({ phase: "editing" });

  const close = () => {
    onClose();
    if (state.phase === "sent") setState({ phase: "editing" });
  };

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const body = {
      organizationSlug: feedbackOrganizationSlug(pathname),
      kind,
      text:
        typeof form.get("text") === "string" ? String(form.get("text")) : "",
      ...(kind === "problem"
        ? {
            expected: optional(form.get("expected")),
            actual: optional(form.get("actual"))
          }
        : {}),
      path: reportPath(pathname),
      device: device()
    };
    const parsed = clientCreateFeedbackReportRequestSchema.safeParse(
      JSON.parse(JSON.stringify(body))
    );
    if (!parsed.success) {
      setState({
        phase: "editing",
        error: "Напишите хотя бы пару слов — от 10 до 4000 символов."
      });
      return;
    }
    setState({ phase: "sending" });
    try {
      const response = await browserApiRequest("/v1/feedback", {
        method: "POST",
        body: JSON.stringify(parsed.data)
      });
      if (response.ok) {
        setState({ phase: "sent" });
        return;
      }
      setState({
        phase: "editing",
        error:
          response.status === 429
            ? "Слишком много сообщений подряд. Попробуйте через час."
            : "Не получилось отправить. Попробуйте ещё раз чуть позже."
      });
    } catch {
      setState({
        phase: "editing",
        error: "Нет связи с сервером. Проверьте интернет и попробуйте ещё раз."
      });
    }
  }

  return (
    <Dialog
      open={open}
      onDismiss={close}
      className={styles.dialog}
      aria-labelledby={`${id}-title`}
    >
      <h2 id={`${id}-title`} className={styles.title}>
        Сообщить о проблеме или идее
      </h2>
      {state.phase === "sent" ? (
        <div className={styles.body}>
          <Alert tone="success" title="Спасибо, сообщение отправлено">
            Мы читаем каждое сообщение и исправляем то, что мешает учиться.
          </Alert>
          <div className={styles.actions}>
            <Button onClick={close}>Закрыть</Button>
          </div>
        </div>
      ) : (
        <form className={styles.body} onSubmit={(event) => void submit(event)}>
          <p className={styles.hint}>
            Мы увидим, на какой странице вы были. Не пишите пароли и личные
            данные.
          </p>
          <div
            onChange={(event) => {
              const target = event.target as HTMLInputElement;
              if (target.name === "kind") setKind(target.value as Kind);
            }}
          >
            <RadioGroup
              legend="О чём сообщение"
              name="kind"
              options={KINDS}
              defaultValue="problem"
              disabled={state.phase === "sending"}
            />
          </div>
          <Field htmlFor={`${id}-text`} label={TEXT_LABEL[kind]}>
            <Textarea
              id={`${id}-text`}
              name="text"
              rows={4}
              minLength={10}
              maxLength={4000}
              required
              disabled={state.phase === "sending"}
            />
          </Field>
          {kind === "problem" && (
            <>
              <Field
                htmlFor={`${id}-expected`}
                label="Что вы ожидали? (необязательно)"
              >
                <Textarea
                  id={`${id}-expected`}
                  name="expected"
                  rows={2}
                  maxLength={2000}
                  disabled={state.phase === "sending"}
                />
              </Field>
              <Field
                htmlFor={`${id}-actual`}
                label="Что произошло вместо этого? (необязательно)"
              >
                <Textarea
                  id={`${id}-actual`}
                  name="actual"
                  rows={2}
                  maxLength={2000}
                  disabled={state.phase === "sending"}
                />
              </Field>
            </>
          )}
          {state.phase === "editing" && state.error && (
            <Alert tone="danger">{state.error}</Alert>
          )}
          <div className={styles.actions}>
            <Button variant="ghost" onClick={close}>
              Отмена
            </Button>
            <Button type="submit" loading={state.phase === "sending"}>
              Отправить
            </Button>
          </div>
        </form>
      )}
    </Dialog>
  );
}
