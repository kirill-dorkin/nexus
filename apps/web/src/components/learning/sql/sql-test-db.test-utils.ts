import { PGlite } from "@electric-sql/pglite";
import type { SqlDb } from "./sql-engine";

/** The same PGlite build the browser worker uses, created in Node. Tests only. */
export async function openTestDatabase(): Promise<SqlDb & { close(): Promise<void> }> {
  const pg = await PGlite.create();
  return { exec: (query, options) => (pg as unknown as SqlDb).exec(query, options), close: () => pg.close() };
}
