import type { CssCheck } from "./css-rules";

/** SQL challenges start from one of the teaching databases. */
export type SqlBase = "shop" | "empty";

/** A challenge as authored in a ```challenge fence, and the checks that run on the learner's code. */

export type ChallengeCheck = {
  label: string;
  /** CSS selector that must match (or must not match, with `absent`). */
  selector?: string | undefined;
  /** Case-insensitive source fragment, for things the DOM hides (doctype, comments). */
  contains?: string | undefined;
  /** A CSS declaration the learner must write (see css-rules.ts). */
  css?: CssCheck | undefined;
  /** A JavaScript expression that must be truthy after the learner's page has run (may use await). */
  js?: string | undefined;
  /** Text the learner's code must print to the console. */
  log?: string | undefined;
  /** SQL: a query run after the learner's code that must return true. */
  sql?: string | undefined;
  /** SQL: a reference query whose rows the learner's last result must match. */
  rows?: string | undefined;
  /** With `rows`: row order matters. */
  ordered?: boolean | undefined;
  /** With `rows`: column names (aliases) matter. */
  names?: boolean | undefined;
  count?: number | undefined;
  /** Passes only if at most this many elements match. */
  max?: number | undefined;
  text?: string | undefined;
  attr?: string | undefined;
  value?: string | undefined;
  absent?: boolean | undefined;
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

const str = (v: unknown, max: number): v is string =>
  typeof v === "string" && v.length <= max;
const opt = (v: unknown, max: number) => v === undefined || str(v, max);

export function parseChallenge(source: string): Challenge | null {
  let raw: unknown;
  try {
    raw = JSON.parse(source);
  } catch {
    return null;
  }
  const c = raw as Record<string, unknown> | null;
  if (
    !c ||
    !str(c.title, 120) ||
    !str(c.task, 1000) ||
    !str(c.start, 6000) ||
    !opt(c.hint, 600) ||
    !opt(c.solution, 6000)
  )
    return null;
  if (
    c.lang !== undefined &&
    c.lang !== "html" &&
    c.lang !== "js" &&
    c.lang !== "sql"
  )
    return null;
  if (!opt(c.page, 3000) || (c.page !== undefined && c.lang !== "js"))
    return null;
  const sql = c.lang === "sql";
  if (!opt(c.setup, 4000) || (c.setup !== undefined && !sql)) return null;
  if (c.db !== undefined && !(sql && (c.db === "shop" || c.db === "empty")))
    return null;
  if (!Array.isArray(c.checks) || c.checks.length < 1 || c.checks.length > 8)
    return null;
  const checks: ChallengeCheck[] = [];
  for (const raw of c.checks as unknown[]) {
    if (typeof raw !== "object" || raw === null) return null;
    const item = raw as Record<string, unknown>;
    if (
      !str(item.label, 140) ||
      !opt(item.selector, 200) ||
      !opt(item.contains, 200) ||
      !opt(item.text, 200) ||
      !opt(item.attr, 60) ||
      !opt(item.value, 300) ||
      !opt(item.js, 400) ||
      !opt(item.log, 200) ||
      (typeof item.js === "string" && /<\/script/i.test(item.js)) ||
      !opt(item.sql, 600) ||
      !opt(item.rows, 600) ||
      [
        item.selector,
        item.contains,
        item.css,
        item.js,
        item.log,
        item.sql,
        item.rows
      ].filter((v) => v !== undefined).length !== 1 ||
      // SQL challenges are checked by queries (and source fragments); web challenges never by queries.
      (sql
        ? item.selector !== undefined ||
          item.css !== undefined ||
          item.js !== undefined ||
          item.log !== undefined
        : item.sql !== undefined || item.rows !== undefined) ||
      ((item.ordered !== undefined || item.names !== undefined) &&
        item.rows === undefined) ||
      (item.ordered !== undefined && typeof item.ordered !== "boolean") ||
      (item.names !== undefined && typeof item.names !== "boolean") ||
      (item.css !== undefined && !validCssCheck(item.css)) ||
      (item.count !== undefined &&
        !(
          Number.isInteger(item.count) &&
          (item.count as number) >= 1 &&
          (item.count as number) <= 50
        )) ||
      (item.max !== undefined &&
        !(
          Number.isInteger(item.max) &&
          (item.max as number) >= 0 &&
          (item.max as number) <= 50
        )) ||
      (item.absent !== undefined && typeof item.absent !== "boolean")
    )
      return null;
    checks.push(item as ChallengeCheck);
  }
  return {
    title: c.title,
    task: c.task,
    start: c.start,
    checks,
    ...(c.hint === undefined ? {} : { hint: c.hint }),
    ...(c.solution === undefined ? {} : { solution: c.solution }),
    ...(c.lang === undefined ? {} : { lang: c.lang }),
    ...(c.page === undefined ? {} : { page: c.page }),
    ...(c.db === undefined ? {} : { db: c.db }),
    ...(c.setup === undefined ? {} : { setup: c.setup })
  };
}

function validCssCheck(value: unknown): value is CssCheck {
  const c = value as Record<string, unknown> | null;
  const values = c?.value === undefined ? [] : [c.value].flat();
  return (
    !!c &&
    str(c.selector, 200) &&
    c.selector.length > 0 &&
    str(c.property, 80) &&
    c.property.length > 0 &&
    values.length <= 8 &&
    values.every((v) => str(v, 200)) &&
    opt(c.includes, 120) &&
    opt(c.within, 120)
  );
}

export const isRunCheck = (check: ChallengeCheck) =>
  check.js !== undefined || check.log !== undefined;
export const isRunnable = (challenge: Challenge) =>
  challenge.lang === "js" || challenge.checks.some(isRunCheck);
export const isSqlCheck = (check: ChallengeCheck) =>
  check.sql !== undefined || check.rows !== undefined;

/** The page a challenge's static checks read: the learner's HTML, or the fixed page of a JS challenge. */
export const staticPage = (challenge: Challenge, code: string) =>
  challenge.lang === "js"
    ? (challenge.page ?? "")
    : challenge.lang === "sql"
      ? ""
      : code;
