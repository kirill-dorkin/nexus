# ADR-0065: SQL practice on a PostgreSQL that runs in the learner's browser

- Status: Accepted
- Date: 2026-11-02
- Related: ADR-0007 (separate grader security boundary), ADR-0056 (deterministic learner quiz checks), ADR-0064 (runnable JavaScript practice)

## Context

An SQL course needs a real database. A learner has to see what a query returns, and checks have to compare the result with the expected one. Reading SQL text statically is not enough, because many different queries are correct.

Running learner SQL on the platform's PostgreSQL is out of the question. It is the source of truth for tenant data (RLS, outbox), and untrusted execution belongs behind the grader boundary (ADR-0007).

## Decision

1. **The engine is PGlite**: PostgreSQL 18 compiled to WebAssembly (`@electric-sql/pglite`). It runs in the learner's browser, so learners practise the real PostgreSQL dialect, the same one the platform uses.
2. **It runs in a dedicated Web Worker** (`sql/sql-worker.ts`).
   - The wasm database has no network or host filesystem. SQL cannot run JavaScript or reach the page, cookies or the API.
   - The client runs one job at a time. A job that takes longer than 5 s (an endless recursive CTE, `pg_sleep`) terminates the worker, and the next job starts a fresh one. A database the learner managed to break is replaced the same way.
3. **Every run starts from the same state.**
   - The engine rolls back any open transaction, runs `DISCARD ALL`, drops every non-system schema, and recreates the teaching store database (`sql/shop-db.ts`, base `"shop"`) or an empty one (`"empty"`). A challenge may add its own `setup` SQL.
   - A learner can change or drop anything. The next keystroke starts clean.
4. **Checks are author-written and declarative** (`lang: "sql"` challenges).
   - `rows`: the learner's last result set must equal a reference query's result on a fresh database. By default rows are compared by value in any order and numbers by value (`290` equals `290.00`). `ordered` and `names` make row order and column names significant.
   - `sql`: a query run after the learner's code that must return true. It is used for `INSERT`, `UPDATE`, DDL and transactions.
   - `contains`: the existing static source fragment check.
5. **Same engine everywhere.** Challenges, SQL concept cards (`lang: "sql"`) and "Попробовать" on ```sql fences use the same engine. The tests run the same `sql-engine.ts` on the same PGlite build in Node: every authored solution passes, every start fails, and every card example runs without an error.
6. **Practice never becomes evidence.** As in ADR-0064, results stay in the browser. Official progress, Evidence and Mastery come only from server-graded activities.

## Consequences

- The SQL course gets real PostgreSQL behaviour (types, `ILIKE`, window functions, `RETURNING`, `ON CONFLICT`, transactions) with instant feedback and no server load.
- PGlite adds about 15 MB of static assets (about 4 MB compressed). They are downloaded only on pages that run SQL, and the browser caches them. The first run waits up to a few seconds while the engine starts.
- Error messages come from PostgreSQL in English. A Russian hint is added for common SQLSTATE codes.
- Changing the teaching data changes expected results. The course tests recompute them from the reference queries, so a data change that breaks a task fails CI.

## Amendment (2026-11): neutral teaching database

The courses no longer follow a café storyline. The teaching database became a generic store (stationery, paper, gifts, books) in `sql/shop-db.ts`. Table names, columns (except `volume_ml` → `weight_g`), ids and prices are unchanged, so expected results stay stable. The base is named `"shop"`. The earlier name `"zerno"` was accepted as an alias until every course was republished, then removed.
