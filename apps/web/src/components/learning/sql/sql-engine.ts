import { itemAt } from "../../../lib/item-at";
/*
 * SQL practice engine (ADR-0065). Runs learner SQL against a fresh copy of the teaching
 * database inside PGlite (PostgreSQL compiled to WebAssembly) and evaluates author checks.
 * Pure apart from the database handle it is given: the browser passes a PGlite instance that
 * lives in a dedicated Web Worker (sql-worker.ts); the tests pass one created in Node.
 * Practice only: nothing here is Evidence, and nothing leaves the learner's browser.
 */
import { SHOP_DATA, SHOP_SCHEMA } from "./shop-db";

/** "shop" — the teaching store database; "empty" — no tables. */
export type SqlBase = "shop" | "empty";
export type SqlCheck = {
  /** A query run after the learner's code; passes when its first value is true. */
  sql?: string | undefined;
  /** A reference query: the learner's last result must have the same rows. */
  rows?: string | undefined;
  /** With `rows`: the row order must match too. */
  ordered?: boolean | undefined;
  /** With `rows`: the column names must match too (aliases). */
  names?: boolean | undefined;
};
export type SqlJob = {
  code: string;
  base?: SqlBase | undefined;
  setup?: string | undefined;
  checks?: SqlCheck[] | undefined;
};
export type SqlCell = string | null;
export type SqlOutput =
  | { kind: "rows"; columns: string[]; rows: SqlCell[][]; total: number }
  | { kind: "done"; message: string }
  | {
      kind: "error";
      message: string;
      hint?: string | undefined;
      line?: number | undefined;
    }
  | { kind: "empty" };
export type SqlRun = { output: SqlOutput; results: boolean[] };

type Field = { name: string; dataTypeID: number };
type ExecResult = {
  rows: unknown[][];
  fields: Field[];
  affectedRows?: number | undefined;
};
type ExecOptions = {
  rowMode: "array";
  parsers: Record<number, (value: string) => unknown>;
};
/** The part of PGlite the engine needs. */
export type SqlDb = {
  exec(query: string, options?: ExecOptions): Promise<ExecResult[]>;
};

const SHOWN_ROWS = 100;

// Every value comes back as PostgreSQL prints it (like psql), so learners see `290.00`,
// `2025-09-01 08:15:00` and `{1,2}` exactly as the database stores them.
const asText = (value: string) => value;
const TEXT_TYPES = [
  20, 21, 23, 26, 700, 701, 790, 1700, 114, 3802, 1082, 1083, 1114, 1184, 1186,
  1266, 17, 25, 1043, 1042
];
const PARSERS: Record<number, (value: string) => unknown> = {
  ...Object.fromEntries(TEXT_TYPES.map((oid) => [oid, asText] as const)),
  16: (value: string) =>
    value === "t" ? "true" : value === "f" ? "false" : value
};
const OPTIONS: ExecOptions = { rowMode: "array", parsers: PARSERS };

function cell(value: unknown): SqlCell {
  if (value === null || value === undefined) return null;
  if (Array.isArray(value))
    return `{${value.map((v) => (v === null ? "NULL" : String(cell(v)))).join(",")}}`;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "object") return JSON.stringify(value);
  if (typeof value === "string") return value;
  if (
    typeof value === "number" ||
    typeof value === "boolean" ||
    typeof value === "bigint"
  )
    return String(value);
  return null;
}

type Rowset = { columns: string[]; rows: SqlCell[][] };
const rowset = (result: ExecResult): Rowset => ({
  columns: result.fields.map((f) => f.name),
  rows: result.rows.map((row) => row.map(cell))
});
const lastRowset = (results: ExecResult[]): Rowset | null => {
  for (let i = results.length - 1; i >= 0; i--)
    if (itemAt(results, i).fields.length) return rowset(itemAt(results, i));
  return null;
};

const ERROR_HINTS: Record<string, string> = {
  "42601":
    "Синтаксическая ошибка: проверь запятые, кавычки, скобки и порядок слов.",
  "42P01": "Такой таблицы нет. Названия таблиц — в панели «Таблицы базы».",
  "42703": "Такого столбца нет: проверь имя и то, из какой он таблицы.",
  "42702":
    "Столбец с таким именем есть в нескольких таблицах — укажи таблицу, например `p.name`.",
  "42883":
    "Такой функции или оператора нет для этих типов. Возможно, нужно привести тип через `::`.",
  "42803":
    "Столбец в SELECT должен быть в GROUP BY или внутри агрегатной функции.",
  "42804": "Типы не совпадают: например, текст там, где ждут число.",
  "42P07": "Такая таблица уже есть.",
  "42701": "Такой столбец уже есть.",
  "42712": "Один и тот же псевдоним таблицы использован дважды.",
  "23505":
    "Нарушена уникальность: такое значение уже есть в уникальном столбце.",
  "23502": "Обязательный столбец (NOT NULL) остался пустым.",
  "23503":
    "Нарушен внешний ключ: ссылка ведёт на несуществующую строку, или на удаляемую строку кто-то ссылается.",
  "23514": "Значение не прошло проверку CHECK.",
  "22P02":
    "Значение не подходит по типу: например, текст вместо числа или даты.",
  "22007": "Неверный формат даты или времени. Пиши даты как '2025-09-01'.",
  "22008": "Такой даты или времени не бывает.",
  "22012": "Деление на ноль.",
  "22003": "Число не помещается в тип столбца.",
  "21000": "Подзапрос вернул несколько строк там, где ждали одну.",
  "25P02": "Транзакция уже прервана ошибкой: заверши её командой ROLLBACK.",
  "2BP01":
    "На этот объект ссылаются другие — удалить его можно только вместе с ними (CASCADE)."
};

function errorOutput(error: unknown, code: string): SqlOutput {
  const e: { message?: unknown; code?: unknown; position?: unknown } =
    typeof error === "object" && error !== null ? error : {};
  const message =
    typeof e.message === "string" ? e.message : "Запрос не выполнился";
  const position = Number(e.position);
  const line =
    Number.isInteger(position) && position > 0
      ? code.slice(0, position - 1).split("\n").length
      : undefined;
  const hint = typeof e.code === "string" ? ERROR_HINTS[e.code] : undefined;
  return {
    kind: "error",
    message,
    ...(hint ? { hint } : {}),
    ...(line ? { line } : {})
  };
}

const isNumber = (s: string) => /^-?\d+(?:\.\d+)?$/.test(s);
/** Cells match as text, and numbers by value, so `290` and `290.00` are equal. */
const sameCell = (a: SqlCell, b: SqlCell) =>
  a === b ||
  (a !== null &&
    b !== null &&
    isNumber(a) &&
    isNumber(b) &&
    Number(a) === Number(b));
const cellKey = (c: SqlCell) =>
  c === null ? "\u0000" : isNumber(c) ? String(Number(c)) : c;
const rowKey = (row: SqlCell[]) => JSON.stringify(row.map(cellKey));

export function sameRows(
  actual: Rowset | null,
  expected: Rowset | null,
  check: SqlCheck
): boolean {
  if (!actual || !expected) return false;
  if (
    actual.columns.length !== expected.columns.length ||
    actual.rows.length !== expected.rows.length
  )
    return false;
  if (
    check.names &&
    actual.columns.some(
      (name, i) =>
        name.toLowerCase() !== itemAt(expected.columns, i).toLowerCase()
    )
  )
    return false;
  if (check.ordered)
    return actual.rows.every((row, i) =>
      row.every((c, j) => sameCell(c, itemAt(itemAt(expected.rows, i), j)))
    );
  const a = actual.rows.map(rowKey).sort();
  const b = expected.rows.map(rowKey).sort();
  return a.every((key, i) => key === b[i]);
}

export class BrokenDatabaseError extends Error {}

/** Puts the database back to the starting state of the job, whatever the previous run did. */
export async function resetDatabase(
  db: SqlDb,
  job: Pick<SqlJob, "base" | "setup">
): Promise<void> {
  try {
    // Separate calls: DISCARD ALL refuses to run inside a multi-statement query.
    await db.exec("ROLLBACK");
    await db.exec("DISCARD ALL");
    await db.exec(`DO $$ DECLARE s text; BEGIN
  FOR s IN SELECT nspname FROM pg_namespace WHERE nspname NOT LIKE 'pg\\_%' AND nspname <> 'information_schema' LOOP
    EXECUTE format('DROP SCHEMA %I CASCADE', s);
  END LOOP;
END $$;
CREATE SCHEMA public;`);
    if ((job.base ?? "shop") !== "empty")
      await db.exec(SHOP_SCHEMA + SHOP_DATA);
  } catch (error) {
    throw new BrokenDatabaseError(
      error instanceof Error ? error.message : String(error)
    );
  }
  if (job.setup) await db.exec(job.setup);
}

function describeDone(results: ExecResult[]): SqlOutput {
  // PGlite reports affected rows cumulatively within one call; the last statement's share is the delta.
  const last = results[results.length - 1];
  const before =
    results.length > 1
      ? (itemAt(results, results.length - 2).affectedRows ?? 0)
      : 0;
  const affected = Math.max(0, (last?.affectedRows ?? 0) - before);
  const statements = results.length;
  const message = affected
    ? `Готово. Затронуто строк: ${affected}.`
    : statements > 1
      ? `Готово. Выполнено команд: ${statements}.`
      : "Готово. Команда выполнена.";
  return { kind: "done", message };
}

export async function runSqlJob(db: SqlDb, job: SqlJob): Promise<SqlRun> {
  const checks = job.checks ?? [];
  const expected: (Rowset | null)[] = [];
  for (const check of checks) {
    if (check.rows === undefined) {
      expected.push(null);
      continue;
    }
    await resetDatabase(db, job);
    try {
      expected.push(lastRowset(await db.exec(check.rows, OPTIONS)));
    } catch {
      expected.push(null);
    }
  }
  await resetDatabase(db, job);
  if (!job.code.replace(/--[^\n]*/g, "").trim())
    return { output: { kind: "empty" }, results: checks.map(() => false) };

  let output: SqlOutput;
  let learner: Rowset | null = null;
  let ran = true;
  try {
    const results = await db.exec(job.code, OPTIONS);
    learner = lastRowset(results);
    const shown = results[results.length - 1];
    output =
      learner && shown?.fields.length
        ? {
            kind: "rows",
            columns: learner.columns,
            rows: learner.rows.slice(0, SHOWN_ROWS),
            total: learner.rows.length
          }
        : describeDone(results);
  } catch (error) {
    ran = false;
    output = errorOutput(error, job.code);
  }

  const results: boolean[] = [];
  for (const [i, check] of checks.entries()) {
    if (!ran) {
      results.push(false);
      continue;
    }
    if (check.rows !== undefined) {
      results.push(sameRows(learner, itemAt(expected, i), check));
      continue;
    }
    try {
      const value = lastRowset(
        await db.exec(check.sql ?? "SELECT false", OPTIONS)
      )?.rows[0]?.[0];
      results.push(value === "true");
    } catch {
      results.push(false);
    }
  }
  return { output, results };
}
