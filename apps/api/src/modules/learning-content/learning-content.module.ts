import { Module } from "@nestjs/common";

import { OutboxModule } from "../../outbox/outbox.module";
import { AuthorizationModule } from "../authorization/authorization.module";
import { IdentityModule } from "../identity/identity.module";
import { LearningContentRepository } from "./application/learning-content.repository";
import { LearningContentApplicationService } from "./application/learning-content.service";
import { LearningGraphRepository } from "./application/learning-graph.repository";
import { LearningGraphApplicationService } from "./application/learning-graph.service";
import { PostgresLearningContentRepository } from "./infrastructure/postgres-learning-content.repository";
import { PostgresLearningGraphRepository } from "./infrastructure/postgres-learning-graph.repository";
import { LearningContentController } from "./learning-content.controller";
import { SkillsController } from "./skills.controller";

@Module({
  imports: [IdentityModule, AuthorizationModule, OutboxModule],
  controllers: [LearningContentController, SkillsController],
  providers: [
    LearningContentApplicationService,
    LearningGraphApplicationService,
    {
      provide: LearningContentRepository,
      useClass: PostgresLearningContentRepository
    },
    {
      provide: LearningGraphRepository,
      useClass: PostgresLearningGraphRepository
    }
  ],
  exports: [LearningContentApplicationService, LearningGraphApplicationService]
})
export class LearningContentModule {}
