import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { runSqlJob, sameRows, type SqlDb } from "./sql-engine";
import { openTestDatabase } from "./sql-test-db.test-utils";

let db: SqlDb & { close(): Promise<void> };
beforeAll(async () => { db = await openTestDatabase(); }, 60000);
afterAll(async () => { await db?.close(); });

describe("SQL practice engine", () => {
  it("runs a query on the teaching database and prints values as PostgreSQL does", async () => {
    const { output } = await runSqlJob(db, { code: "SELECT name, price, is_available, added_on FROM products WHERE id = 7;" });
    expect(output).toEqual({ kind: "rows", columns: ["name", "price", "is_available", "added_on"], rows: [["Мокко", "260.00", "false", "2024-09-01"]], total: 1 });
    const counts = await runSqlJob(db, { code: "SELECT count(*), array[1,2], NULL::text AS nothing, '{\"a\":1}'::jsonb AS j" });
    expect(counts.output).toMatchObject({ rows: [["1", "{1,2}", null, "{\"a\": 1}"]] });
  });

  it("starts every run from the same state, whatever the previous run changed", async () => {
    await runSqlJob(db, { code: "DELETE FROM order_items; DROP TABLE reviews; CREATE SCHEMA junk; CREATE TEMP TABLE t (x int); SET search_path = junk; BEGIN;" });
    const { output } = await runSqlJob(db, { code: "SELECT (SELECT count(*) FROM order_items), (SELECT count(*) FROM reviews), (SELECT count(*) FROM pg_namespace WHERE nspname = 'junk')" });
    expect(output).toMatchObject({ rows: [["33", "9", "0"]] });
  });

  it("keeps identity sequences after the seeded ids", async () => {
    const { output } = await runSqlJob(db, { code: "INSERT INTO products (name, category_id, price) VALUES ('Бамбл', 1, 300) RETURNING id" });
    expect(output).toMatchObject({ rows: [["17"]] });
  });

  it("explains errors in Russian and points at the line", async () => {
    const { output, results } = await runSqlJob(db, { code: "SELECT name\nFROM drinks;", checks: [{ rows: "SELECT name FROM products" }] });
    expect(output).toMatchObject({ kind: "error", line: 2, hint: expect.stringContaining("таблицы нет") });
    expect(results).toEqual([false]);
  });

  it("reports what a data change did", async () => {
    const { output } = await runSqlJob(db, { code: "UPDATE products SET price = price + 10 WHERE category_id = 2;" });
    expect(output).toEqual({ kind: "done", message: "Готово. Затронуто строк: 3." });
  });

  it("compares results with a reference query, by value and optionally by order and names", async () => {
    const reference = "SELECT name, price FROM products WHERE price > 250 ORDER BY price DESC";
    const learner = await runSqlJob(db, {
      code: "SELECT name, round(price) AS cost FROM products WHERE price > 250 ORDER BY price",
      checks: [{ rows: reference }, { rows: reference, ordered: true }, { rows: reference, names: true }]
    });
    expect(learner.results).toEqual([true, false, false]);
    expect(sameRows({ columns: ["a"], rows: [["1"]] }, { columns: ["a"], rows: [["1"], ["1"]] }, {})).toBe(false);
  });

  it("evaluates check queries after the learner's changes", async () => {
    const run = await runSqlJob(db, {
      code: "INSERT INTO categories (name) VALUES ('Лимонады');",
      checks: [{ sql: "SELECT count(*) = 6 FROM categories" }, { sql: "SELECT count(*) = 5 FROM categories" }, { sql: "SELECT nonsense" }]
    });
    expect(run.results).toEqual([true, false, false]);
  });

  it("supports an empty database with its own setup", async () => {
    const run = await runSqlJob(db, { base: "empty", setup: "CREATE TABLE t (x int); INSERT INTO t VALUES (1), (2);", code: "SELECT sum(x) FROM t" });
    expect(run.output).toMatchObject({ rows: [["3"]] });
    const empty = await runSqlJob(db, { base: "empty", code: "SELECT count(*) FROM products" });
    expect(empty.output).toMatchObject({ kind: "error" });
  });
});
