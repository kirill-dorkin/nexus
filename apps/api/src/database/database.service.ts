import { Injectable, type OnApplicationShutdown } from "@nestjs/common";
import {
  createDatabasePool,
  withTenantTransaction as runTenantTransaction,
  withTransaction as runTransaction,
  withUserTransaction as runUserTransaction,
  type DatabaseTransaction,
  type DatabaseTransactionOptions,
  type TenantTransactionContext,
  type UserTransactionContext
} from "@platform/database";

function requireDatabaseUrl(): string {
  const databaseUrl = process.env.DATABASE_URL;

  if (databaseUrl === undefined || databaseUrl.trim().length === 0) {
    throw new Error(
      "DATABASE_URL is required to start the API database boundary."
    );
  }

  return databaseUrl;
}

@Injectable()
export class DatabaseService implements OnApplicationShutdown {
  private readonly pool = createDatabasePool(requireDatabaseUrl(), {
    applicationName: "platform-api"
  });

  transaction<T>(
    operation: (transaction: DatabaseTransaction) => Promise<T>,
    options?: DatabaseTransactionOptions
  ): Promise<T> {
    return runTransaction(this.pool, operation, options);
  }

  userTransaction<T>(
    context: UserTransactionContext,
    operation: (transaction: DatabaseTransaction) => Promise<T>,
    options?: DatabaseTransactionOptions
  ): Promise<T> {
    return runUserTransaction(this.pool, context, operation, options);
  }

  tenantTransaction<T>(
    context: TenantTransactionContext,
    operation: (transaction: DatabaseTransaction) => Promise<T>,
    options?: DatabaseTransactionOptions
  ): Promise<T> {
    return runTenantTransaction(this.pool, context, operation, options);
  }

  async nextUuid(): Promise<string> {
    const result = await this.pool.query<{ id: string }>(
      "SELECT uuidv7()::text AS id"
    );
    const id = result.rows[0]?.id;

    if (id === undefined) {
      throw new Error("PostgreSQL did not return a UUID from uuidv7().");
    }

    return id;
  }

  async onApplicationShutdown(): Promise<void> {
    await this.pool.end();
  }
}
