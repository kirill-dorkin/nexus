import { Module } from "@nestjs/common";

import { OutboxModule } from "../../outbox/outbox.module";
import { AuthorizationModule } from "../authorization/authorization.module";
import { IdentityModule } from "../identity/identity.module";
import { LearningContentModule } from "../learning-content/learning-content.module";
import { LearningDeliveryModule } from "../learning-delivery/learning-delivery.module";
import { LearningProgressRepository } from "./application/learning-progress.repository";
import { LearningProgressApplicationService } from "./application/learning-progress.service";
import { PostgresLearningProgressRepository } from "./infrastructure/postgres-learning-progress.repository";
import { LearningProgressController } from "./learning-progress.controller";

@Module({
  imports: [
    IdentityModule,
    AuthorizationModule,
    OutboxModule,
    LearningContentModule,
    LearningDeliveryModule
  ],
  controllers: [LearningProgressController],
  providers: [
    LearningProgressApplicationService,
    {
      provide: LearningProgressRepository,
      useClass: PostgresLearningProgressRepository
    }
  ]
})
export class LearningProgressModule {}
