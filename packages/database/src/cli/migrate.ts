import { createDatabasePool } from "../pool";
import { migrateDatabase } from "../migrator";

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
    console.log("Database is already up to date.");
  } else {
    for (const migration of result.applied) {
      console.log(`Applied ${migration}`);
    }
  }
} finally {
  await pool.end();
}
