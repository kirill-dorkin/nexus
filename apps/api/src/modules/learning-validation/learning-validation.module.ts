import { Module } from "@nestjs/common";

import { OutboxModule } from "../../outbox/outbox.module";
import { AuthorizationModule } from "../authorization/authorization.module";
import { IdentityModule } from "../identity/identity.module";
import { LearningContentModule } from "../learning-content/learning-content.module";
import { LearningHistoryModule } from "../learning-history/learning-history.module";
import { LearningProgressModule } from "../learning-progress/learning-progress.module";
import { GraderJobRepository } from "./application/grader-job.repository";
import { GraderJobApplicationService } from "./application/grader-job.service";
import { ValidationRepository } from "./application/validation.repository";
import { ValidationApplicationService } from "./application/validation.service";
import { GraderProfileCatalog } from "./domain/grader-profile.catalog";
import { ValidatorRegistry } from "./domain/validator-registry";
import { PostgresGraderJobRepository } from "./infrastructure/postgres-grader-job.repository";
import { PostgresValidationRepository } from "./infrastructure/postgres-validation.repository";
import { GraderJobController } from "./grader-job.controller";
import { LearningValidationController } from "./learning-validation.controller";

@Module({
  imports: [
    IdentityModule,
    AuthorizationModule,
    OutboxModule,
    LearningContentModule,
    LearningHistoryModule,
    LearningProgressModule
  ],
  controllers: [LearningValidationController, GraderJobController],
  providers: [
    ValidationApplicationService,
    GraderJobApplicationService,
    ValidatorRegistry,
    GraderProfileCatalog,
    {
      provide: ValidationRepository,
      useClass: PostgresValidationRepository
    },
    {
      provide: GraderJobRepository,
      useClass: PostgresGraderJobRepository
    }
  ],
  exports: [ValidationApplicationService, GraderJobApplicationService]
})
export class LearningValidationModule {}
