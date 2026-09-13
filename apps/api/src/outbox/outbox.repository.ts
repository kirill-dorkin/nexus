import type { DatabaseTransaction } from "@platform/database";

export type OutboxMessage = Readonly<{
  organizationId: string | null;
  eventName: string;
  eventVersion: number;
  aggregateType: string;
  aggregateId: string;
  actorUserId: string | null;
  payload: Readonly<Record<string, unknown>>;
  metadata?: Readonly<Record<string, unknown>>;
}>;

export abstract class OutboxRepository {
  abstract append(
    transaction: DatabaseTransaction,
    message: OutboxMessage
  ): Promise<void>;
}
