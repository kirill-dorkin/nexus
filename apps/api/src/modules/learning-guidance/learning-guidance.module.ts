import { Module } from "@nestjs/common";
import { AuthorizationModule } from "../authorization/authorization.module";
import { IdentityModule } from "../identity/identity.module";
import { LearningContentModule } from "../learning-content/learning-content.module";
import { LearningHistoryModule } from "../learning-history/learning-history.module";
import { LearningProgressModule } from "../learning-progress/learning-progress.module";
import { GuidanceExposureRepository } from "./application/guidance-exposure.repository";
import { LearningGuidanceApplicationService } from "./application/learning-guidance.service";
import { PostgresGuidanceExposureRepository } from "./infrastructure/postgres-guidance-exposure.repository";
import { LearningGuidanceController } from "./learning-guidance.controller";

@Module({
  imports: [IdentityModule, AuthorizationModule, LearningContentModule, LearningProgressModule, LearningHistoryModule],
  controllers: [LearningGuidanceController],
  providers: [LearningGuidanceApplicationService, { provide: GuidanceExposureRepository, useClass: PostgresGuidanceExposureRepository }]
})
export class LearningGuidanceModule {}
