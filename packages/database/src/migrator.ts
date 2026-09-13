import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

import type { Pool, PoolClient } from "pg";

const MIGRATION_FILE_PATTERN = /^\d{6}_[a-z0-9_]+\.sql$/;
const MIGRATION_LOCK_KEY = "learning-platform:migrations:v1";

export type MigrationFile = Readonly<{
  name: string;
  checksum: string;
  sql: string;
}>;

export type MigrationResult = Readonly<{
  applied: readonly string[];
  alreadyApplied: readonly string[];
}>;

export async function readMigrations(
  directory = fileURLToPath(new URL("../migrations", import.meta.url))
): Promise<readonly MigrationFile[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const filenames = entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".sql"))
    .map((entry) => entry.name)
    .sort((left, right) => left.localeCompare(right));

  for (const filename of filenames) {
    if (!MIGRATION_FILE_PATTERN.test(filename)) {
      throw new Error(
        `Invalid migration filename "${filename}". Expected NNNNNN_snake_case.sql.`
      );
    }
  }

  return Promise.all(
    filenames.map(async (name) => {
      const sql = await readFile(path.join(directory, name), "utf8");

      if (sql.trim().length === 0) {
        throw new Error(`Migration "${name}" is empty.`);
      }

      return {
        name,
        sql,
        checksum: createHash("sha256").update(sql).digest("hex")
      } satisfies MigrationFile;
    })
  );
}

async function assertPostgres18(client: PoolClient): Promise<void> {
  const result = await client.query<{ server_version_num: string }>(
    "SHOW server_version_num"
  );
  const row = result.rows[0];

  if (row === undefined) {
    throw new Error("PostgreSQL did not return server_version_num.");
  }

  const versionNumber = Number(row.server_version_num);
  const major = Math.trunc(versionNumber / 10_000);

  if (major !== 18) {
    throw new Error(
      `PostgreSQL 18.x is required by the current schema baseline; connected to ${row.server_version_num}.`
    );
  }
}

async function ensureMigrationTable(client: PoolClient): Promise<void> {
  await client.query(`
    CREATE SCHEMA IF NOT EXISTS platform_internal;

    CREATE TABLE IF NOT EXISTS platform_internal.schema_migrations (
      name text PRIMARY KEY,
      checksum char(64) NOT NULL,
      applied_at timestamptz NOT NULL DEFAULT now(),
      execution_ms integer NOT NULL CHECK (execution_ms >= 0)
    );
  `);
}

async function loadAppliedMigrations(
  client: PoolClient
): Promise<ReadonlyMap<string, string>> {
  const result = await client.query<{ name: string; checksum: string }>(`
    SELECT name, checksum
    FROM platform_internal.schema_migrations
    ORDER BY name
  `);

  return new Map(result.rows.map((row) => [row.name, row.checksum]));
}

function validateHistory(
  migrations: readonly MigrationFile[],
  applied: ReadonlyMap<string, string>
): void {
  const sourceByName = new Map(migrations.map((migration) => [migration.name, migration]));

  for (const [name, checksum] of applied) {
    const source = sourceByName.get(name);

    if (source === undefined) {
      throw new Error(
        `Applied migration "${name}" is missing from source control. Migration history must be append-only.`
      );
    }

    if (source.checksum !== checksum) {
      throw new Error(
        `Applied migration "${name}" has been modified. Expected checksum ${checksum}, found ${source.checksum}.`
      );
    }
  }
}

export async function migrateDatabase(
  pool: Pool,
  directory?: string
): Promise<MigrationResult> {
  const migrations = await readMigrations(directory);
  const client = await pool.connect();

  try {
    await assertPostgres18(client);
    await client.query("SELECT pg_advisory_lock(hashtextextended($1, 0))", [
      MIGRATION_LOCK_KEY
    ]);

    try {
      await ensureMigrationTable(client);
      const applied = await loadAppliedMigrations(client);
      validateHistory(migrations, applied);

      const newlyApplied: string[] = [];
      const alreadyApplied: string[] = [];

      for (const migration of migrations) {
        if (applied.has(migration.name)) {
          alreadyApplied.push(migration.name);
          continue;
        }

        const startedAt = performance.now();
        await client.query("BEGIN");

        try {
          await client.query("SET LOCAL lock_timeout = '5s'");
          await client.query("SET LOCAL statement_timeout = '60s'");
          await client.query(migration.sql);

          const executionMs = Math.max(0, Math.round(performance.now() - startedAt));
          await client.query(
            `INSERT INTO platform_internal.schema_migrations
              (name, checksum, execution_ms)
             VALUES ($1, $2, $3)`,
            [migration.name, migration.checksum, executionMs]
          );
          await client.query("COMMIT");
          newlyApplied.push(migration.name);
        } catch (error) {
          await client.query("ROLLBACK");
          throw error;
        }
      }

      return {
        applied: newlyApplied,
        alreadyApplied
      };
    } finally {
      await client.query("SELECT pg_advisory_unlock(hashtextextended($1, 0))", [
        MIGRATION_LOCK_KEY
      ]);
    }
  } finally {
    client.release();
  }
}
