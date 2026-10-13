import { Injectable } from "@nestjs/common";
import type { DatabaseTransaction } from "@platform/database";

import {
  OutboxRepository,
  type OutboxMessage
} from "./outbox.repository";

@Injectable()
export class PostgresOutboxRepository extends OutboxRepository {
  async append(
    transaction: DatabaseTransaction,
    message: OutboxMessage
  ): Promise<void> {
    await transaction.client.query(
      `INSERT INTO events.outbox
         (organization_id, event_name, event_version, aggregate_type,
          aggregate_id, actor_user_id, payload, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8::jsonb)`,
      [
        message.organizationId,
        message.eventName,
        message.eventVersion,
        message.aggregateType,
        message.aggregateId,
        message.actorUserId,
        JSON.stringify(message.payload),
        JSON.stringify(message.metadata ?? {})
      ]
    );
  }
}
