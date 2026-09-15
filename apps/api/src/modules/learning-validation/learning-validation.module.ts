import { Module } from "@nestjs/common";

import { OutboxModule } from "../../outbox/outbox.module";
import { AuthorizationModule } from "../authorization/authorization.module";
import { IdentityModule } from "../identity/identity.module";
import { LearningContentModule } from "../learning-content/learning-content.module";
import { LearningProgressModule } from "../learning-progress/learning-progress.module";
import { ValidationRepository } from "./application/validation.repository";
import { ValidationApplicationService } from "./application/validation.service";
import { ValidatorRegistry } from "./domain/validator-registry";
import { PostgresValidationRepository } from "./infrastructure/postgres-validation.repository";
import { LearningValidationController } from "./learning-validation.controller";

@Module({
  imports: [
    IdentityModule,
    AuthorizationModule,
    OutboxModule,
    LearningContentModule,
    LearningProgressModule
  ],
  controllers: [LearningValidationController],
  providers: [
    ValidationApplicationService,
    ValidatorRegistry,
    {
      provide: ValidationRepository,
      useClass: PostgresValidationRepository
    }
  ],
  exports: [ValidationApplicationService]
})
export class LearningValidationModule {}
