"use client";

import { Database, Warning } from "@phosphor-icons/react/dist/ssr";
import type { SqlRun } from "./sql-engine";
import { ZERNO_TABLES } from "./zerno-db";
import styles from "./sql.module.css";

const plural = (n: number, one: string, few: string, many: string) => {
  const d = n % 10, h = n % 100;
  return d === 1 && h !== 11 ? one : d >= 2 && d <= 4 && (h < 12 || h > 14) ? few : many;
};

/** What the learner's SQL returned: a table, a short status, or a Russian explanation of the error. */
export function SqlOutput({ run, busy }: { run: SqlRun | null; busy: boolean }) {
  if (!run) {
    return <div className={styles.status} role="status">{busy ? "Запускаю базу данных…" : "Здесь появится результат запроса."}</div>;
  }
  const { output } = run;
  return (
    <div className={styles.output} data-busy={busy || undefined} aria-live="polite">
      {output.kind === "empty" ? <div className={styles.status}>Напиши запрос — результат появится здесь.</div> : null}
      {output.kind === "done" ? <div className={styles.status} data-tone="ok">{output.message}</div> : null}
      {output.kind === "error" ? (
        <div className={styles.error} role="alert">
          <Warning size={18} weight="fill" aria-hidden="true" />
          <div>
            <p className={styles.errorTitle}>Ошибка{output.line ? ` в строке ${output.line}` : ""}: <code>{output.message}</code></p>
            {output.hint ? <p className={styles.errorHint}>{output.hint}</p> : null}
          </div>
        </div>
      ) : null}
      {output.kind === "rows" ? (
        <>
          <div className={styles.tableWrap} tabIndex={0} aria-label="Результат запроса, прокручиваемая таблица">
            <table className={styles.table}>
              <thead>
                <tr>{output.columns.map((name, i) => <th key={i} scope="col">{name}</th>)}</tr>
              </thead>
              <tbody>
                {output.rows.map((row, i) => (
                  <tr key={i}>{row.map((value, j) => <td key={j} data-null={value === null || undefined}>{value ?? "NULL"}</td>)}</tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className={styles.count}>
            {output.total} {plural(output.total, "строка", "строки", "строк")}
            {output.total > output.rows.length ? ` · показаны первые ${output.rows.length}` : ""}
          </p>
        </>
      ) : null}
    </div>
  );
}

/** The tables of the teaching database, so learners never have to guess a name. */
export function SqlSchema() {
  return (
    <details className={styles.schema}>
      <summary><Database size={16} aria-hidden="true" /> Таблицы базы «Зерно»</summary>
      <ul>
        {ZERNO_TABLES.map((table) => (
          <li key={table.name}>
            <code>{table.name}</code> <span className={styles.schemaTitle}>— {table.title}</span>
            <span className={styles.columns}>{table.columns.join(", ")}</span>
          </li>
        ))}
      </ul>
    </details>
  );
}
