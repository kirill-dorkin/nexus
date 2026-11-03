import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { createDatabasePool } from "../pool";
import { migrateDatabase } from "../migrator";

const localEnvFile = fileURLToPath(new URL("../../../../.env", import.meta.url));
if (existsSync(localEnvFile)) {
  process.loadEnvFile(localEnvFile);
}

const connectionString = process.env.DATABASE_MIGRATION_URL;

if (connectionString === undefined || connectionString.trim().length === 0) {
  throw new Error(
    "DATABASE_MIGRATION_URL is required. Runtime DATABASE_URL must never be used for migrations."
  );
}

const pool = createDatabasePool(connectionString, {
  applicationName: "platform-migrator",
  maxConnections: 1
});

try {
  const result = await migrateDatabase(pool);

  if (result.applied.length === 0) {
    process.stdout.write("Database is already up to date.\n");
  } else {
    for (const migration of result.applied) {
      process.stdout.write(`Applied ${migration}\n`);
    }
  }
} finally {
  await pool.end();
}
