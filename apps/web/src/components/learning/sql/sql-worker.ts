/*
 * Dedicated Web Worker that owns the PGlite database for SQL practice (ADR-0065).
 * Keeping PostgreSQL off the main thread means a heavy or endless query can be stopped by
 * terminating the worker, without freezing the lesson page.
 */
import { PGlite } from "@electric-sql/pglite";
import {
  BrokenDatabaseError,
  runSqlJob,
  type SqlDb,
  type SqlJob
} from "./sql-engine";

type Scope = {
  onmessage:
    ((event: MessageEvent<{ id: number; job: SqlJob }>) => void) | null;
  postMessage(message: unknown): void;
};
const scope = self as unknown as Scope;
let database: Promise<SqlDb> | null = null;

scope.onmessage = (event) => {
  const { id, job } = event.data;
  void (async () => {
    try {
      database ??= PGlite.create().then((pg) => pg as unknown as SqlDb);
      scope.postMessage({ id, run: await runSqlJob(await database, job) });
    } catch (error) {
      if (!(error instanceof BrokenDatabaseError)) database = null;
      scope.postMessage({
        id,
        failure: error instanceof BrokenDatabaseError ? "broken" : "failed"
      });
    }
  })();
};
