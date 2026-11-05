"use client";

import { emitLearningStep } from "../../lib/analytics/lesson-tracker";
import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ReactNode
} from "react";
import {
  ArrowCounterClockwiseIcon,
  CheckIcon,
  EyeIcon,
  LightbulbIcon,
  TrophyIcon
} from "@phosphor-icons/react/dist/ssr";
import { useIsClient } from "../../lib/hooks/browser";
import { useStoredValue, writeStoredValue } from "../../lib/hooks/stored-value";
import { CodeEditor } from "./code-snippet";
import { isRunnerMessage } from "./js-runner";
import { useSqlRun } from "./sql/sql-client";
import { SqlOutput, SqlSchema } from "./sql/sql-output";
import { SaveProgressHint } from "./signup-nudge";
import codeStyles from "./code.module.css";
import styles from "./challenge.module.css";

/*
 * Hands-on lesson challenge authored as JSON in a ```challenge Markdown fence.
 * The learner edits HTML; declarative checks run in the browser against an inert
 * DOMParser document (no scripts execute) and light up live as they type.
 * Runnable challenges (`lang: "js"`, or any `js`/`log` check) execute the learner's code in an
 * opaque-origin sandbox with the network closed (js-runner.ts, ADR-0064).
 * SQL challenges (`lang: "sql"`) run the learner's queries against a fresh teaching database
 * in PGlite inside a Web Worker (sql/, ADR-0065).
 * This is practice only: official progress still comes from server-checked quizzes.
 */

import { ChecksList } from "./challenge/checks-list";
import { Inline } from "./challenge/inline";
import { WebResult } from "./challenge/web-result";
import {
  hashText,
  isRunCheck,
  isRunnable,
  isSqlCheck,
  parseChallenge,
  runChecks,
  sqlJob,
  staticPage,
  storageKey,
  type Challenge
} from "./challenge/model";

export {
  isRunCheck,
  isRunnable,
  isSqlCheck,
  parseChallenge,
  runChecks,
  sqlJob,
  staticPage,
  type Challenge,
  type ChallengeCheck
} from "./challenge/model";

export function ChallengeBlock({ challenge }: { challenge: Challenge }) {
  const [code, setCode] = useState(challenge.start);
  const [checked, setChecked] = useState(challenge.start);
  const [hint, setHint] = useState(false);
  const key = storageKey(challenge);
  const solvedBefore = useStoredValue(key) === "1";
  useEffect(() => {
    const timer = window.setTimeout(() => setChecked(code), 250);
    return () => window.clearTimeout(timer);
  }, [code]);
  // Checks need DOMParser, so they run only in the browser (never during server rendering).
  const isClient = useIsClient();
  const staticResults = useMemo(
    () =>
      isClient
        ? runChecks(
            checked,
            challenge.checks,
            new DOMParser().parseFromString(
              staticPage(challenge, checked),
              "text/html"
            )
          )
        : challenge.checks.map(() => false),
    [isClient, checked, challenge]
  );
  // Runnable checks: a hidden sandbox runs the code and posts one boolean per runnable check.
  const runnable = isRunnable(challenge);
  const id = useId();
  const checkFrame = useRef<HTMLIFrameElement>(null);
  const runChecksList = useMemo(
    () => challenge.checks.filter(isRunCheck),
    [challenge.checks]
  );
  const token = `${id}:${hashText(checked)}`;
  const [runResults, setRunResults] = useState<boolean[]>([]);
  useEffect(() => {
    if (!runnable || !runChecksList.length) return;
    let answered = false;
    const onMessage = (event: MessageEvent) => {
      if (
        event.source !== checkFrame.current?.contentWindow ||
        !isRunnerMessage(event.data, token) ||
        event.data.type !== "result"
      )
        return;
      answered = true;
      setRunResults(event.data.results.slice(0, runChecksList.length));
    };
    window.addEventListener("message", onMessage);
    // A page that never finishes loading (or throws before the checker) counts as not passing.
    const timer = window.setTimeout(() => {
      if (!answered) setRunResults([]);
    }, 5000);
    return () => {
      window.removeEventListener("message", onMessage);
      window.clearTimeout(timer);
    };
  }, [runnable, runChecksList, token]);
  // SQL challenges: the worker runs the learner's queries on a fresh database and answers per check.
  const isSql = challenge.lang === "sql";
  const webLang = challenge.lang === "js" ? "js" : "html";
  const sql = useSqlRun(isSql ? sqlJob(challenge, checked) : null, id);
  const results = useMemo(() => {
    let k = 0;
    let q = 0;
    return challenge.checks.map((check, i) =>
      isRunCheck(check)
        ? runResults[k++] === true
        : isSqlCheck(check)
          ? sql.run?.results[q++] === true
          : staticResults[i] === true
    );
  }, [challenge.checks, runResults, staticResults, sql.run]);
  const passed = results.filter(Boolean).length;
  const done = passed === results.length;
  // Solved in this visit: every check passes on code the learner changed.
  const celebrate = done && checked !== challenge.start;
  const solved = solvedBefore || celebrate;
  useEffect(() => {
    if (celebrate) writeStoredValue(key, "1");
  }, [celebrate, key]);
  const solution = challenge.solution;
  return (
    <section
      className={styles.challenge}
      data-done={done || undefined}
      aria-label={`Задание: ${challenge.title}`}
    >
      <header className={styles.head}>
        <span className={styles.badge}>
          {solved ? (
            <CheckIcon size={14} weight="bold" aria-hidden="true" />
          ) : null}
          Задание
          {solved ? <span className={styles.srOnly}> решено</span> : null}
        </span>
        <h3 className={styles.title}>{challenge.title}</h3>
        <span className={styles.score} aria-hidden="true">
          {passed}/{results.length}
        </span>
      </header>
      <p className={styles.task}>
        <Inline text={challenge.task} />
      </p>
      <ChecksList checks={challenge.checks} results={results} />
      <div className={`${codeStyles.snippet} ${styles.workspace}`}>
        <CodeEditor
          value={code}
          onChange={(value) => {
            setCode(value);
            emitLearningStep("practice_run");
          }}
          language={challenge.lang ?? "html"}
          label={`Код задания «${challenge.title}». Tab — отступ, Escape и затем Tab — выйти из редактора`}
        />
        <div className={codeStyles.result}>
          <div className={codeStyles.resultBar}>
            <span>Результат</span>
            <span className={codeStyles.live}>
              <span aria-hidden="true" /> обновляется при вводе
            </span>
          </div>
          {isSql ? (
            <SqlOutput run={sql.run} busy={sql.busy} />
          ) : (
            <WebResult
              challenge={challenge}
              code={checked}
              lang={webLang}
              runnable={runnable}
              preview={`${id}:preview`}
              token={token}
              checks={runChecksList}
              checkFrame={checkFrame}
            />
          )}
        </div>
      </div>
      {isSql && (challenge.db ?? "shop") !== "empty" ? <SqlSchema /> : null}
      {celebrate ? (
        <p className={styles.success} role="status">
          <TrophyIcon size={20} weight="fill" aria-hidden="true" /> Готово! Всё
          работает — идём дальше.
        </p>
      ) : null}
      {celebrate ? <SaveProgressHint /> : null}
      {hint && challenge.hint ? (
        <p className={styles.hint}>
          <LightbulbIcon size={18} weight="fill" aria-hidden="true" />{" "}
          <span>
            <Inline text={challenge.hint} />
          </span>
        </p>
      ) : null}
      <div className={styles.actions}>
        {challenge.hint && !hint && !done ? (
          <button
            type="button"
            className={styles.action}
            onClick={() => setHint(true)}
          >
            <LightbulbIcon size={16} aria-hidden="true" /> Подсказка
          </button>
        ) : null}
        {solution && !done ? (
          <button
            type="button"
            className={styles.action}
            onClick={() => setCode(solution)}
          >
            <EyeIcon size={16} aria-hidden="true" /> Показать решение
          </button>
        ) : null}
        <button
          type="button"
          className={styles.action}
          disabled={code === challenge.start}
          onClick={() => {
            setCode(challenge.start);
            setChecked(challenge.start);
          }}
        >
          <ArrowCounterClockwiseIcon size={16} aria-hidden="true" /> Начать
          заново
        </button>
      </div>
    </section>
  );
}

export function ChallengeFence({
  source,
  fallback
}: {
  source: string;
  fallback: ReactNode;
}) {
  const challenge = useMemo(() => parseChallenge(source), [source]);
  return challenge ? <ChallengeBlock challenge={challenge} /> : <>{fallback}</>;
}
