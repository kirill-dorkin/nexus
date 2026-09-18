import { Module } from "@nestjs/common";

import { AuthorizationModule } from "../authorization/authorization.module";
import { IdentityModule } from "../identity/identity.module";
import { LearningContentModule } from "../learning-content/learning-content.module";
import { LearningDeliveryModule } from "../learning-delivery/learning-delivery.module";
import { LearningProgressModule } from "../learning-progress/learning-progress.module";
import { LearningRecommendationsModule } from "../learning-recommendations/learning-recommendations.module";
import { CourseReadinessEvaluator } from "./application/course-readiness-evaluator";
import { LearningReadinessApplicationService } from "./application/learning-readiness.service";
import {
  LearningReadinessController,
  OfferingReadinessController
} from "./learning-readiness.controller";

@Module({
  imports: [
    IdentityModule,
    AuthorizationModule,
    LearningContentModule,
    LearningDeliveryModule,
    LearningProgressModule,
    LearningRecommendationsModule
  ],
  controllers: [LearningReadinessController, OfferingReadinessController],
  providers: [CourseReadinessEvaluator, LearningReadinessApplicationService]
})
export class LearningReadinessModule {}
