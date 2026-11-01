"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { ArrowCounterClockwise, Check, Circle, Eye, Lightbulb, Trophy } from "@phosphor-icons/react/dist/ssr";
import { brand } from "@platform/brand";
import { CodeEditor } from "./code-snippet";
import { SaveProgressHint } from "./signup-nudge";
import codeStyles from "./code.module.css";
import styles from "./challenge.module.css";

/*
 * Hands-on lesson challenge authored as JSON in a ```challenge Markdown fence.
 * The learner edits HTML; declarative checks run in the browser against an inert
 * DOMParser document (no scripts execute) and light up live as they type.
 * This is practice only: official progress still comes from server-checked quizzes.
 */

export type ChallengeCheck = {
  label: string;
  /** CSS selector that must match (or must not match, with `absent`). */
  selector?: string;
  /** Case-insensitive source fragment, for things the DOM hides (doctype, comments). */
  contains?: string;
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
  if (!Array.isArray(c.checks) || c.checks.length < 1 || c.checks.length > 8) return null;
  const checks: ChallengeCheck[] = [];
  for (const item of c.checks as Record<string, unknown>[]) {
    if (!item || !str(item.label, 140) || !opt(item.selector, 200) || !opt(item.contains, 200) || !opt(item.text, 200) ||
      !opt(item.attr, 60) || !opt(item.value, 300) || (item.selector === undefined) === (item.contains === undefined) ||
      (item.count !== undefined && !(Number.isInteger(item.count) && (item.count as number) >= 1 && (item.count as number) <= 50)) ||
      (item.max !== undefined && !(Number.isInteger(item.max) && (item.max as number) >= 0 && (item.max as number) <= 50)) ||
      (item.absent !== undefined && typeof item.absent !== "boolean")) return null;
    checks.push(item as ChallengeCheck);
  }
  return {
    title: c.title, task: c.task, start: c.start, checks,
    ...(c.hint === undefined ? {} : { hint: c.hint as string }),
    ...(c.solution === undefined ? {} : { solution: c.solution as string })
  };
}

const norm = (s: string) => s.replace(/\s+/g, " ").trim().toLowerCase();

/** Evaluates every check against the learner's HTML. Pure apart from DOMParser. */
export function runChecks(code: string, checks: ChallengeCheck[], doc: Document): boolean[] {
  const source = code.toLowerCase();
  return checks.map((check) => {
    if (check.contains !== undefined) {
      const found = source.includes(check.contains.toLowerCase());
      return check.absent ? !found : found;
    }
    let found: Element[];
    try {
      found = [...doc.querySelectorAll(check.selector!)];
    } catch {
      return false;
    }
    found = found.filter((el) =>
      (check.text === undefined || norm(el.textContent ?? "").includes(norm(check.text))) &&
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
  const [results, setResults] = useState<boolean[]>(() => challenge.checks.map(() => false));
  useEffect(() => {
    setResults(runChecks(checked, challenge.checks, new DOMParser().parseFromString(checked, "text/html")));
  }, [checked, challenge.checks]);
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
  return (
    <section className={styles.challenge} data-done={done || undefined} aria-label={`Задание: ${challenge.title}`}>
      <header className={styles.head}>
        <span className={styles.badge}>{solved ? <Check size={14} weight="bold" aria-hidden="true" /> : null}Задание</span>
        <h3 className={styles.title}>{challenge.title}</h3>
        <span className={styles.score} aria-hidden="true">{passed}/{results.length}</span>
      </header>
      <p className={styles.task}><Inline text={challenge.task} /></p>
      <ul className={styles.checks} aria-live="polite">
        {challenge.checks.map((check, i) => (
          <li key={i} data-ok={results[i] || undefined}>
            {results[i] ? <Check size={16} weight="bold" aria-hidden="true" /> : <Circle size={16} aria-hidden="true" />}
            <span><Inline text={check.label} /></span>
            <span className={styles.srOnly}>{results[i] ? " — выполнено" : " — пока нет"}</span>
          </li>
        ))}
      </ul>
      <div className={`${codeStyles.snippet} ${styles.workspace}`}>
        <CodeEditor value={code} onChange={setCode} autoFocus={false}
          label={`Код задания «${challenge.title}». Tab — отступ, Escape и затем Tab — выйти из редактора`} />
        <div className={codeStyles.result}>
          <div className={codeStyles.resultBar}>
            <span>Результат</span>
            <span className={codeStyles.live}><span aria-hidden="true" /> обновляется при вводе</span>
          </div>
          <div className={`${codeStyles.frameWrap} ${styles.frameWrap}`}>
            <iframe className={codeStyles.frame} title={`Результат задания «${challenge.title}»`} sandbox=""
              referrerPolicy="no-referrer" srcDoc={checked} />
          </div>
        </div>
      </div>
      {celebrate && done ? (
        <p className={styles.success} role="status">
          <Trophy size={20} weight="fill" aria-hidden="true" /> Готово! Всё работает — идём дальше.
        </p>
      ) : null}
      {celebrate && done ? <SaveProgressHint /> : null}
      {hint && challenge.hint ? <p className={styles.hint}><Lightbulb size={18} weight="fill" aria-hidden="true" /> <span><Inline text={challenge.hint} /></span></p> : null}
      <div className={styles.actions}>
        {challenge.hint && !hint && !done ? (
          <button type="button" className={styles.action} onClick={() => setHint(true)}>
            <Lightbulb size={16} aria-hidden="true" /> Подсказка
          </button>
        ) : null}
        {challenge.solution && !done ? (
          <button type="button" className={styles.action} onClick={() => setCode(challenge.solution!)}>
            <Eye size={16} aria-hidden="true" /> Показать решение
          </button>
        ) : null}
        <button type="button" className={styles.action} disabled={code === challenge.start}
          onClick={() => { setCode(challenge.start); setCelebrate(false); }}>
          <ArrowCounterClockwise size={16} aria-hidden="true" /> Начать заново
        </button>
      </div>
    </section>
  );
}

export function ChallengeFence({ source, fallback }: { source: string; fallback: ReactNode }) {
  const challenge = useMemo(() => parseChallenge(source), [source]);
  return challenge ? <ChallengeBlock challenge={challenge} /> : <>{fallback}</>;
}
