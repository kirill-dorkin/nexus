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

export async function withTransaction<T>(
  pool: Pool,
  operation: (transaction: DatabaseTransaction) => Promise<T>
): Promise<T> {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
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
  operation: (transaction: DatabaseTransaction) => Promise<T>
): Promise<T> {
  if (context.organizationId.trim().length === 0) {
    throw new Error("organizationId is required for a tenant transaction.");
  }

  if (context.userId.trim().length === 0) {
    throw new Error("userId is required for a tenant transaction.");
  }

  return withTransaction(pool, async (transaction) => {
    await transaction.client.query(
      `SELECT
         set_config('app.organization_id', $1, true),
         set_config('app.user_id', $2, true)`,
      [context.organizationId, context.userId]
    );

    return operation(transaction);
  });
}
