"use client";

import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";
import { ArrowCounterClockwiseIcon, CheckIcon, CircleIcon, EyeIcon, LightbulbIcon, TrophyIcon } from "@phosphor-icons/react/dist/ssr";
import { brand } from "@platform/brand";
import { CodeEditor } from "./code-snippet";
import { cssMatches, readCss, type CssCheck } from "./css-rules";
import { isRunnerMessage, runnerDocument } from "./js-runner";
import { useSqlRun } from "./sql/sql-client";
import type { SqlBase, SqlJob } from "./sql/sql-engine";
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

export type ChallengeCheck = {
  label: string;
  /** CSS selector that must match (or must not match, with `absent`). */
  selector?: string;
  /** Case-insensitive source fragment, for things the DOM hides (doctype, comments). */
  contains?: string;
  /** A CSS declaration the learner must write (see css-rules.ts). */
  css?: CssCheck;
  /** A JavaScript expression that must be truthy after the learner's page has run (may use await). */
  js?: string;
  /** Text the learner's code must print to the console. */
  log?: string;
  /** SQL: a query run after the learner's code that must return true. */
  sql?: string;
  /** SQL: a reference query whose rows the learner's last result must match. */
  rows?: string;
  /** With `rows`: row order matters. */
  ordered?: boolean;
  /** With `rows`: column names (aliases) matter. */
  names?: boolean;
  count?: number;
  /** Passes only if at most this many elements match. */
  max?: number;
  text?: string;
  attr?: string;
  value?: string;
  absent?: boolean;
};
export type Challenge = {
  title: string;
  task: string;
  start: string;
  checks: ChallengeCheck[];
  hint?: string;
  solution?: string;
  /** "js": the learner edits JavaScript that runs on top of the fixed `page` markup. "sql": queries. */
  lang?: "html" | "js" | "sql";
  page?: string;
  /** SQL: the starting database ("shop" by default) and extra SQL run before the learner's code. */
  db?: SqlBase;
  setup?: string;
};

const str = (v: unknown, max: number): v is string => typeof v === "string" && v.length <= max;
const opt = (v: unknown, max: number) => v === undefined || str(v, max);

export function parseChallenge(source: string): Challenge | null {
  let raw: unknown;
  try {
    raw = JSON.parse(source);
  } catch {
    return null;
  }
  const c = raw as Record<string, unknown> | null;
  if (!c || !str(c.title, 120) || !str(c.task, 1000) || !str(c.start, 6000) || !opt(c.hint, 600) || !opt(c.solution, 6000)) return null;
  if (c.lang !== undefined && c.lang !== "html" && c.lang !== "js" && c.lang !== "sql") return null;
  if (!opt(c.page, 3000) || (c.page !== undefined && c.lang !== "js")) return null;
  const sql = c.lang === "sql";
  if (!opt(c.setup, 4000) || (c.setup !== undefined && !sql)) return null;
  if (c.db !== undefined && !(sql && (c.db === "shop" || c.db === "empty"))) return null;
  if (!Array.isArray(c.checks) || c.checks.length < 1 || c.checks.length > 8) return null;
  const checks: ChallengeCheck[] = [];
  for (const raw of c.checks as unknown[]) {
    if (typeof raw !== "object" || raw === null) return null;
    const item = raw as Record<string, unknown>;
    if (!str(item.label, 140) || !opt(item.selector, 200) || !opt(item.contains, 200) || !opt(item.text, 200) ||
      !opt(item.attr, 60) || !opt(item.value, 300) ||
      !opt(item.js, 400) || !opt(item.log, 200) || (typeof item.js === "string" && /<\/script/i.test(item.js)) ||
      !opt(item.sql, 600) || !opt(item.rows, 600) ||
      [item.selector, item.contains, item.css, item.js, item.log, item.sql, item.rows].filter((v) => v !== undefined).length !== 1 ||
      // SQL challenges are checked by queries (and source fragments); web challenges never by queries.
      (sql ? item.selector !== undefined || item.css !== undefined || item.js !== undefined || item.log !== undefined
        : item.sql !== undefined || item.rows !== undefined) ||
      ((item.ordered !== undefined || item.names !== undefined) && item.rows === undefined) ||
      (item.ordered !== undefined && typeof item.ordered !== "boolean") || (item.names !== undefined && typeof item.names !== "boolean") ||
      (item.css !== undefined && !validCssCheck(item.css)) ||
      (item.count !== undefined && !(Number.isInteger(item.count) && (item.count as number) >= 1 && (item.count as number) <= 50)) ||
      (item.max !== undefined && !(Number.isInteger(item.max) && (item.max as number) >= 0 && (item.max as number) <= 50)) ||
      (item.absent !== undefined && typeof item.absent !== "boolean")) return null;
    checks.push(item as ChallengeCheck);
  }
  return {
    title: c.title, task: c.task, start: c.start, checks,
    ...(c.hint === undefined ? {} : { hint: c.hint }),
    ...(c.solution === undefined ? {} : { solution: c.solution }),
    ...(c.lang === undefined ? {} : { lang: c.lang }),
    ...(c.page === undefined ? {} : { page: c.page }),
    ...(c.db === undefined ? {} : { db: c.db }),
    ...(c.setup === undefined ? {} : { setup: c.setup })
  };
}

const norm = (s: string) => s.replace(/\s+/g, " ").trim().toLowerCase();

function validCssCheck(value: unknown): value is CssCheck {
  const c = value as Record<string, unknown> | null;
  const values = c?.value === undefined ? [] : [c.value].flat();
  return !!c && str(c.selector, 200) && (c.selector).length > 0 && str(c.property, 80) && (c.property).length > 0 &&
    values.length <= 8 && values.every((v) => str(v, 200)) && opt(c.includes, 120) && opt(c.within, 120);
}

export const isRunCheck = (check: ChallengeCheck) => check.js !== undefined || check.log !== undefined;
export const isRunnable = (challenge: Challenge) => challenge.lang === "js" || challenge.checks.some(isRunCheck);
export const isSqlCheck = (check: ChallengeCheck) => check.sql !== undefined || check.rows !== undefined;

/** What the SQL engine runs for a challenge: the learner's code on the starting database, with the query checks. */
export const sqlJob = (challenge: Challenge, code: string): SqlJob => ({
  code, base: challenge.db, setup: challenge.setup,
  checks: challenge.checks.filter(isSqlCheck).map(({ sql, rows, ordered, names }) => ({ sql, rows, ordered, names }))
});

/** The page a challenge's static checks read: the learner's HTML, or the fixed page of a JS challenge. */
export const staticPage = (challenge: Challenge, code: string) =>
  (challenge.lang === "js" ? challenge.page ?? "" : challenge.lang === "sql" ? "" : code);

/**
 * Evaluates the static checks against the learner's HTML. Pure apart from DOMParser.
 * Runnable checks (`js`, `log`) and SQL checks report false here; their results come from the
 * sandbox and the SQL engine.
 */
export function runChecks(code: string, checks: ChallengeCheck[], doc: Document): boolean[] {
  const source = code.toLowerCase();
  let rules: ReturnType<typeof readCss> | null = null;
  return checks.map((check) => {
    if (isRunCheck(check) || isSqlCheck(check)) return false;
    if (check.css !== undefined) {
      rules ??= readCss(code);
      const found = cssMatches(rules, check.css);
      return check.absent ? !found : found;
    }
    if (check.contains !== undefined) {
      const found = source.includes(check.contains.toLowerCase());
      return check.absent ? !found : found;
    }
    if (check.selector === undefined) return false;
    let found: Element[];
    try {
      found = [...doc.querySelectorAll(check.selector)];
    } catch {
      return false;
    }
    found = found.filter((el) =>
      (check.text === undefined || norm(el.textContent).includes(norm(check.text))) &&
      (check.attr === undefined || (el.hasAttribute(check.attr) &&
        (check.value === undefined || (el.getAttribute(check.attr) ?? "").trim() === check.value)))
    );
    if (check.absent) return found.length === 0;
    if (check.max !== undefined) return found.length <= check.max && found.length >= (check.count ?? 0);
    return found.length >= (check.count ?? 1);
  });
}

/** `inline code` in task and hint text, rendered as text nodes only. */
function Inline({ text }: { text: string }): ReactNode {
  return text.split(/(`[^`]+`)/).map((part, i) =>
    part.startsWith("`") && part.endsWith("`") && part.length > 2 ? <code key={i}>{part.slice(1, -1)}</code> : part
  );
}

function hashText(text: string) {
  let h = 0;
  for (const ch of text) h = (h * 31 + ch.charCodeAt(0)) | 0;
  return (h >>> 0).toString(36);
}

function storageKey(challenge: Challenge) {
  let h = 0;
  for (const ch of challenge.title + challenge.start) h = (h * 31 + ch.charCodeAt(0)) | 0;
  return `${brand.slug}:challenge:${(h >>> 0).toString(36)}`;
}

export function ChallengeBlock({ challenge }: { challenge: Challenge }) {
  const [code, setCode] = useState(challenge.start);
  const [checked, setChecked] = useState(challenge.start);
  const [hint, setHint] = useState(false);
  const [solved, setSolved] = useState(false);
  const [celebrate, setCelebrate] = useState(false);
  useEffect(() => {
    try {
      if (localStorage.getItem(storageKey(challenge)) === "1") setSolved(true);
    } catch {
      /* storage unavailable: progress simply is not remembered */
    }
  }, [challenge]);
  useEffect(() => {
    const timer = window.setTimeout(() => setChecked(code), 250);
    return () => window.clearTimeout(timer);
  }, [code]);
  // Checks need DOMParser, so they run only in the browser (never during server rendering).
  const [staticResults, setStaticResults] = useState<boolean[]>(() => challenge.checks.map(() => false));
  useEffect(() => {
    setStaticResults(runChecks(checked, challenge.checks, new DOMParser().parseFromString(staticPage(challenge, checked), "text/html")));
  }, [checked, challenge]);
  // Runnable checks: a hidden sandbox runs the code and posts one boolean per runnable check.
  const runnable = isRunnable(challenge);
  const id = useId();
  const checkFrame = useRef<HTMLIFrameElement>(null);
  const runChecksList = useMemo(() => challenge.checks.filter(isRunCheck), [challenge.checks]);
  const token = `${id}:${hashText(checked)}`;
  const [runResults, setRunResults] = useState<boolean[]>([]);
  useEffect(() => {
    if (!runnable || !runChecksList.length) return;
    let answered = false;
    const onMessage = (event: MessageEvent) => {
      if (event.source !== checkFrame.current?.contentWindow || !isRunnerMessage(event.data, token) || event.data.type !== "result") return;
      answered = true;
      setRunResults(event.data.results.slice(0, runChecksList.length));
    };
    window.addEventListener("message", onMessage);
    // A page that never finishes loading (or throws before the checker) counts as not passing.
    const timer = window.setTimeout(() => { if (!answered) setRunResults([]); }, 5000);
    return () => { window.removeEventListener("message", onMessage); window.clearTimeout(timer); };
  }, [runnable, runChecksList, token]);
  // SQL challenges: the worker runs the learner's queries on a fresh database and answers per check.
  const isSql = challenge.lang === "sql";
  const webLang = challenge.lang === "js" ? "js" : "html";
  const sql = useSqlRun(isSql ? sqlJob(challenge, checked) : null, id);
  const results = useMemo(() => {
    let k = 0;
    let q = 0;
    return challenge.checks.map((check, i) => (isRunCheck(check) ? runResults[k++] === true
      : isSqlCheck(check) ? sql.run?.results[q++] === true : staticResults[i] === true));
  }, [challenge.checks, runResults, staticResults, sql.run]);
  const passed = results.filter(Boolean).length;
  const done = passed === results.length;
  useEffect(() => {
    if (!done || checked === challenge.start) return;
    setCelebrate(true);
    setSolved(true);
    try {
      localStorage.setItem(storageKey(challenge), "1");
    } catch {
      /* ignore */
    }
  }, [done, checked, challenge]);
  const solution = challenge.solution;
  return (
    <section className={styles.challenge} data-done={done || undefined} aria-label={`Задание: ${challenge.title}`}>
      <header className={styles.head}>
        <span className={styles.badge}>{solved ? <CheckIcon size={14} weight="bold" aria-hidden="true" /> : null}Задание</span>
        <h3 className={styles.title}>{challenge.title}</h3>
        <span className={styles.score} aria-hidden="true">{passed}/{results.length}</span>
      </header>
      <p className={styles.task}><Inline text={challenge.task} /></p>
      <ul className={styles.checks} aria-live="polite">
        {challenge.checks.map((check, i) => (
          <li key={i} data-ok={results[i] || undefined}>
            {results[i] ? <CheckIcon size={16} weight="bold" aria-hidden="true" /> : <CircleIcon size={16} aria-hidden="true" />}
            <span><Inline text={check.label} /></span>
            <span className={styles.srOnly}>{results[i] ? " — выполнено" : " — пока нет"}</span>
          </li>
        ))}
      </ul>
      <div className={`${codeStyles.snippet} ${styles.workspace}`}>
        <CodeEditor value={code} onChange={setCode} language={challenge.lang ?? "html"}
          label={`Код задания «${challenge.title}». Tab — отступ, Escape и затем Tab — выйти из редактора`} />
        <div className={codeStyles.result}>
          <div className={codeStyles.resultBar}>
            <span>Результат</span>
            <span className={codeStyles.live}><span aria-hidden="true" /> обновляется при вводе</span>
          </div>
          {isSql ? <SqlOutput run={sql.run} busy={sql.busy} /> : (
          <div className={`${codeStyles.frameWrap} ${styles.frameWrap}`}>
            {runnable ? (
              <iframe className={codeStyles.frame} title={`Результат задания «${challenge.title}»`} sandbox="allow-scripts"
                referrerPolicy="no-referrer"
                srcDoc={runnerDocument({ code: checked, lang: webLang, page: challenge.page, mode: "preview", token: `${id}:preview` })} />
            ) : (
              <iframe className={codeStyles.frame} title={`Результат задания «${challenge.title}»`} sandbox=""
                referrerPolicy="no-referrer" srcDoc={checked} />
            )}
            {runnable && runChecksList.length ? (
              <iframe ref={checkFrame} hidden aria-hidden="true" tabIndex={-1} title="Проверка задания" sandbox="allow-scripts"
                referrerPolicy="no-referrer"
                srcDoc={runnerDocument({ code: checked, lang: webLang, page: challenge.page, mode: "check", token, checks: runChecksList })} />
            ) : null}
          </div>
          )}
        </div>
      </div>
      {isSql && (challenge.db ?? "shop") !== "empty" ? <SqlSchema /> : null}
      {celebrate && done ? (
        <p className={styles.success} role="status">
          <TrophyIcon size={20} weight="fill" aria-hidden="true" /> Готово! Всё работает — идём дальше.
        </p>
      ) : null}
      {celebrate && done ? <SaveProgressHint /> : null}
      {hint && challenge.hint ? <p className={styles.hint}><LightbulbIcon size={18} weight="fill" aria-hidden="true" /> <span><Inline text={challenge.hint} /></span></p> : null}
      <div className={styles.actions}>
        {challenge.hint && !hint && !done ? (
          <button type="button" className={styles.action} onClick={() => setHint(true)}>
            <LightbulbIcon size={16} aria-hidden="true" /> Подсказка
          </button>
        ) : null}
        {solution && !done ? (
          <button type="button" className={styles.action} onClick={() => setCode(solution)}>
            <EyeIcon size={16} aria-hidden="true" /> Показать решение
          </button>
        ) : null}
        <button type="button" className={styles.action} disabled={code === challenge.start}
          onClick={() => { setCode(challenge.start); setCelebrate(false); }}>
          <ArrowCounterClockwiseIcon size={16} aria-hidden="true" /> Начать заново
        </button>
      </div>
    </section>
  );
}

export function ChallengeFence({ source, fallback }: { source: string; fallback: ReactNode }) {
  const challenge = useMemo(() => parseChallenge(source), [source]);
  return challenge ? <ChallengeBlock challenge={challenge} /> : <>{fallback}</>;
}
