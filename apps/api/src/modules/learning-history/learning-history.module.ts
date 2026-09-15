import { Module } from "@nestjs/common";

import { AuthorizationModule } from "../authorization/authorization.module";
import { IdentityModule } from "../identity/identity.module";
import { LearningDeliveryModule } from "../learning-delivery/learning-delivery.module";
import { LearningEventRepository } from "./application/learning-event.repository";
import { LearningEventSink } from "./application/learning-event.sink";
import { LearningEventWriter } from "./application/learning-event.writer";
import { LearningHistoryApplicationService } from "./application/learning-history.service";
import { PostgresLearningEventRepository } from "./infrastructure/postgres-learning-event.repository";
import { LearningHistoryController } from "./learning-history.controller";

@Module({
  imports: [IdentityModule, AuthorizationModule, LearningDeliveryModule],
  controllers: [LearningHistoryController],
  providers: [
    LearningHistoryApplicationService,
    LearningEventWriter,
    {
      provide: LearningEventSink,
      useExisting: LearningEventWriter
    },
    {
      provide: LearningEventRepository,
      useClass: PostgresLearningEventRepository
    }
  ],
  exports: [LearningEventSink]
})
export class LearningHistoryModule {}
