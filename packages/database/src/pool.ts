import { Pool, type PoolConfig } from "pg";

export type DatabasePool = Pool;

export type DatabasePoolOptions = Readonly<{
  applicationName?: string;
  maxConnections?: number;
  connectionTimeoutMs?: number;
  idleTimeoutMs?: number;
}>;

export function createDatabasePool(
  connectionString: string,
  options: DatabasePoolOptions = {}
): DatabasePool {
  if (connectionString.trim().length === 0) {
    throw new Error("Database connection string must not be empty.");
  }

  const config: PoolConfig = {
    connectionString,
    max: options.maxConnections ?? 10,
    connectionTimeoutMillis: options.connectionTimeoutMs ?? 5_000,
    idleTimeoutMillis: options.idleTimeoutMs ?? 30_000
  };

  if (options.applicationName !== undefined) {
    config.application_name = options.applicationName;
  }

  return new Pool(config);
}
