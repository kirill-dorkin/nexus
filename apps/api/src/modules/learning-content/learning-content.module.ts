import { Module } from "@nestjs/common";

import { OutboxModule } from "../../outbox/outbox.module";
import { AuthorizationModule } from "../authorization/authorization.module";
import { IdentityModule } from "../identity/identity.module";
import { LearningContentRepository } from "./application/learning-content.repository";
import { LearningContentApplicationService } from "./application/learning-content.service";
import { PostgresLearningContentRepository } from "./infrastructure/postgres-learning-content.repository";
import { LearningContentController } from "./learning-content.controller";

@Module({
  imports: [IdentityModule, AuthorizationModule, OutboxModule],
  controllers: [LearningContentController],
  providers: [
    LearningContentApplicationService,
    {
      provide: LearningContentRepository,
      useClass: PostgresLearningContentRepository
    }
  ],
  exports: [LearningContentApplicationService]
})
export class LearningContentModule {}
