import { Module } from "@nestjs/common";

import { OutboxRepository } from "./outbox.repository";
import { PostgresOutboxRepository } from "./postgres-outbox.repository";

@Module({
  providers: [
    {
      provide: OutboxRepository,
      useClass: PostgresOutboxRepository
    }
  ],
  exports: [OutboxRepository]
})
export class OutboxModule {}
