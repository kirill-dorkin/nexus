"use client";
import { useId, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import {
  quizCheckResultSchema,
  type PublicQuizActivity,
  type QuizAnswer,
  type QuizCheckResult
} from "@platform/contracts";
import { browserApiRequest } from "../../lib/public-api";
import { learningLoginUrl } from "../../lib/learning-return-to";
import {
  Alert,
  Button,
  Checkbox,
  Field,
  Input,
  Radio,
  Stack,
  Text,
  buttonClass
} from "@platform/ui";
import styles from "./flow.module.css";

export function QuizForm({
  activity,
  organizationSlug,
  offeringSlug,
  lessonSlug
}: {
  activity: PublicQuizActivity;
  organizationSlug: string;
  offeringSlug: string;
  lessonSlug: string;
}) {
  const id = useId();
  const [selected, setSelected] = useState<string[]>([]),
    [text, setText] = useState("");
  const [busy, setBusy] = useState(false),
    [pending, setPending] = useState(false);
  const [result, setResult] = useState<QuizCheckResult | null>(null),
    [error, setError] = useState<string | null>(null);
  const [needsLogin, setNeedsLogin] = useState(false);
  const attempt = useRef<{ attemptKey: string; answer: QuizAnswer } | null>(
    null
  );
  const inFlight = useRef(false);
  const locked = busy || pending || result !== null;
  const ready =
    activity.type === "quiz.short_text"
      ? text.trim().length > 0
      : selected.length > 0;
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (inFlight.current || result || (!attempt.current && !ready)) return;
    inFlight.current = true;
    setBusy(true);
    setError(null);
    setNeedsLogin(false);
    if (!attempt.current) {
      const answer: QuizAnswer =
        activity.type === "quiz.short_text"
          ? { type: activity.type, text }
          : activity.type === "quiz.single_choice"
            ? { type: activity.type, optionId: selected[0]! }
            : { type: activity.type, optionIds: selected };
      attempt.current = { attemptKey: crypto.randomUUID(), answer };
    }
    setPending(true);
    try {
      const response = await browserApiRequest(
        `/v1/me/learning/${encodeURIComponent(organizationSlug)}/${encodeURIComponent(offeringSlug)}/quiz/${encodeURIComponent(activity.slug)}/check`,
        { method: "POST", body: JSON.stringify(attempt.current) }
      );
      if (!response.ok) {
        if (response.status === 401) {
          setNeedsLogin(true);
          setError("Войдите, чтобы сохранить и проверить ответ.");
        } else if ([403, 404, 409].includes(response.status))
          setError(
            "Для проверки нужна активная запись на курс. Проверьте состояние обучения ниже и повторите действие."
          );
        else if (response.status === 400) {
          attempt.current = null;
          setPending(false);
          setError(
            "Проверьте формат ответа и выберите вариант из этого задания."
          );
        } else
          setError(
            "Проверка не завершилась. Повторите отправку этого же ответа."
          );
        return;
      }
      setResult(quizCheckResultSchema.parse(await response.json()));
      setPending(false);
      window.dispatchEvent(new Event("learning-progress-changed"));
    } catch {
      setError(
        "Не удалось получить результат. Повторите отправку этого же ответа."
      );
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }
  function retry() {
    attempt.current = null;
    setResult(null);
    setPending(false);
    setSelected([]);
    setText("");
    setError(null);
    setNeedsLogin(false);
  }
  return (
    <form
      onSubmit={(event) => void submit(event)}
      className={styles.quiz}
      aria-busy={busy}
    >
      <fieldset disabled={locked}>
        <legend>
          {activity.type === "quiz.multiple_choice"
            ? "Выберите все подходящие варианты"
            : activity.type === "quiz.single_choice"
              ? "Выберите один вариант"
              : "Введите короткий ответ"}
        </legend>
        <Text className={styles.quizHint} size="sm" muted>
          Результат сохраняется в вашем обучении после проверки.
        </Text>
        {activity.type === "quiz.short_text" ? (
          <Field htmlFor={`${id}-answer`} label="Ваш ответ">
            <Input
              id={`${id}-answer`}
              value={text}
              maxLength={2000}
              onChange={(event) => setText(event.target.value)}
              autoComplete="off"
            />
          </Field>
        ) : (
          activity.options.map((option) => {
            const Choice =
              activity.type === "quiz.single_choice" ? Radio : Checkbox;
            return (
              <Choice
                key={option.id}
                className={styles.quizOption}
                label={option.text}
                name={id}
                value={option.id}
                checked={selected.includes(option.id)}
                onChange={(event) =>
                  setSelected(
                    activity.type === "quiz.single_choice"
                      ? [option.id]
                      : event.target.checked
                        ? [...selected, option.id]
                        : selected.filter((x) => x !== option.id)
                  )
                }
              />
            );
          })
        )}
      </fieldset>
      {!result && (
        <Button loading={busy} disabled={!pending && !ready} type="submit">
          {busy
            ? "Проверяем…"
            : pending
              ? "Повторить отправку ответа"
              : "Проверить и сохранить ответ"}
        </Button>
      )}
      {result && (
        <Stack aria-live="polite">
          <Alert
            tone={result.outcome === "passed" ? "success" : "warning"}
            title={
              result.outcome === "passed" ? "Правильно" : "Ответ пока неверный"
            }
          >
            {result.feedback}
          </Alert>
          <Text size="sm" muted>
            Попытка {result.attemptNumber}. Результат сохранён.
          </Text>
          <Button variant="secondary" onClick={retry}>
            Попробовать ещё раз
          </Button>
        </Stack>
      )}
      <div aria-live="polite">
        {error && <Alert tone="danger">{error}</Alert>}
      </div>
      {needsLogin && (
        <Link
          className={buttonClass({ size: "md" })}
          href={learningLoginUrl(
            `/learn/${organizationSlug}/${offeringSlug}/${lessonSlug}`
          )}
        >
          Войти и вернуться к ответу
        </Link>
      )}
    </form>
  );
}
