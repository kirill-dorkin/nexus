import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import type { Pool, PoolClient } from "pg";

export type DatabaseTransaction = Readonly<{
  client: PoolClient;
  db: NodePgDatabase<Record<string, never>>;
}>;

export type TenantTransactionContext = Readonly<{
  organizationId: string;
  userId: string;
}>;

export type DatabaseTransactionOptions = Readonly<{
  isolationLevel?: "read_committed" | "repeatable_read" | "serializable";
  readOnly?: boolean;
}>;

const isolationLevelSql = {
  read_committed: "READ COMMITTED",
  repeatable_read: "REPEATABLE READ",
  serializable: "SERIALIZABLE"
} as const;

function beginStatement(options?: DatabaseTransactionOptions): string {
  if (options === undefined) {
    return "BEGIN";
  }

  const clauses: string[] = [];
  if (options.isolationLevel !== undefined) {
    clauses.push(`ISOLATION LEVEL ${isolationLevelSql[options.isolationLevel]}`);
  }
  if (options.readOnly === true) {
    clauses.push("READ ONLY");
  }

  return clauses.length === 0 ? "BEGIN" : `BEGIN ${clauses.join(" ")}`;
}

export async function withTransaction<T>(
  pool: Pool,
  operation: (transaction: DatabaseTransaction) => Promise<T>,
  options?: DatabaseTransactionOptions
): Promise<T> {
  const client = await pool.connect();

  try {
    await client.query(beginStatement(options));
    const result = await operation({
      client,
      db: drizzle(client)
    });
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function withTenantTransaction<T>(
  pool: Pool,
  context: TenantTransactionContext,
  operation: (transaction: DatabaseTransaction) => Promise<T>,
  options?: DatabaseTransactionOptions
): Promise<T> {
  if (context.organizationId.trim().length === 0) {
    throw new Error("organizationId is required for a tenant transaction.");
  }

  if (context.userId.trim().length === 0) {
    throw new Error("userId is required for a tenant transaction.");
  }

  return withTransaction(
    pool,
    async (transaction) => {
      await transaction.client.query(
        `SELECT
           set_config('app.organization_id', $1, true),
           set_config('app.user_id', $2, true)`,
        [context.organizationId, context.userId]
      );

      return operation(transaction);
    },
    options
  );
}
