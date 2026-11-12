"use client";
import { itemAt } from "../../lib/item-at";
import { useId, useRef, useState, type SubmitEvent } from "react";
import Link from "next/link";
import {
  type PublicQuizActivity,
  type QuizAnswer,
  type QuizCheckResult
} from "@platform/contracts";
import { clientQuizCheckResultSchema as quizCheckResultSchema } from "@platform/contracts/client";
import { browserApiRequest } from "../../lib/public-api";
import { learningLoginUrl } from "../../lib/learning-return-to";
import { track } from "../../lib/analytics/product-analytics";
import { lessonUrl } from "../../lib/public-learning-routes";
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
  courseSlug,
  lessonSlug
}: {
  activity: PublicQuizActivity;
  organizationSlug: string;
  offeringSlug: string;
  courseSlug: string;
  lessonSlug: string;
}) {
  const id = useId();
  const returnTo = lessonUrl(
    {
      organization: { slug: organizationSlug },
      offering: { slug: offeringSlug },
      course: { slug: courseSlug }
    },
    lessonSlug
  );
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
  async function startCourse() {
    const join = await browserApiRequest(
      `/v1/public/organizations/${encodeURIComponent(organizationSlug)}/memberships/me`,
      { method: "POST", body: "{}" }
    );
    if (!join.ok) return false;
    const enroll = await browserApiRequest(
      `/v1/me/learning/${encodeURIComponent(organizationSlug)}/${encodeURIComponent(offeringSlug)}/enrollment`,
      { method: "POST", body: "{}" }
    );
    return enroll.ok;
  }
  async function submit(event: SubmitEvent<HTMLFormElement>) {
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
            ? { type: activity.type, optionId: itemAt(selected, 0) }
            : { type: activity.type, optionIds: selected };
      attempt.current = { attemptKey: crypto.randomUUID(), answer };
    }
    setPending(true);
    try {
      const check = () =>
        browserApiRequest(
          `/v1/me/learning/${encodeURIComponent(organizationSlug)}/${encodeURIComponent(offeringSlug)}/quiz/${encodeURIComponent(activity.slug)}/check`,
          { method: "POST", body: JSON.stringify(attempt.current) }
        );
      let response = await check();
      // Signed in but not enrolled yet: start the free course (entry, then
      // enrollment — the same two commands as "Начать курс") and retry once.
      if ([403, 404, 409].includes(response.status) && (await startCourse())) {
        window.dispatchEvent(new Event("learning-progress-changed"));
        response = await check();
      }
      if (!response.ok) {
        if (response.status === 401) {
          setNeedsLogin(true);
        } else if ([403, 404, 409].includes(response.status))
          setError(
            "Этот курс сейчас закрыт для самостоятельной записи. Обратитесь к организации курса."
          );
        else if (response.status === 400) {
          attempt.current = null;
          setPending(false);
          setError(
            "Проверьте формат ответа и выберите вариант из этого задания."
          );
        } else if (response.status === 429)
          setError(
            "Слишком много проверок подряд. Подождите несколько минут и отправьте ответ снова."
          );
        else
          setError(
            "Проверка не завершилась. Повторите отправку этого же ответа."
          );
        return;
      }
      const checked = quizCheckResultSchema.parse(await response.json());
      setResult(checked);
      void track("quiz_checked", {
        organization: organizationSlug,
        offering: offeringSlug,
        lesson: lessonSlug,
        activity: activity.slug,
        outcome: checked.outcome,
        attempt: checked.attemptNumber
      });
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
          Ответ проверится сразу. Если вы вошли, урок засчитается и персонаж
          курса вырастет.
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
        <div className={styles.quizSignup} role="status">
          <strong>Ответ готов к проверке — осталось войти</strong>
          <p>
            Аккаунт бесплатный и создаётся за 20 секунд. После входа вы
            вернётесь к этому заданию.
          </p>
          <div className={styles.quizSignupActions}>
            <Link
              className={buttonClass({ size: "md" })}
              href={`${learningLoginUrl(returnTo)}&mode=register`}
            >
              Создать аккаунт
            </Link>
            <Link
              className={buttonClass({ size: "md", variant: "secondary" })}
              href={learningLoginUrl(returnTo)}
            >
              Войти
            </Link>
          </div>
        </div>
      )}
    </form>
  );
}
