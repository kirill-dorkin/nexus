import { Module } from "@nestjs/common";

import { AuthorizationModule } from "../authorization/authorization.module";
import { IdentityModule } from "../identity/identity.module";
import { LearningContentModule } from "../learning-content/learning-content.module";
import { LearningDeliveryModule } from "../learning-delivery/learning-delivery.module";
import { LearningProgressModule } from "../learning-progress/learning-progress.module";
import { LearningRecommendationsModule } from "../learning-recommendations/learning-recommendations.module";
import { CourseReadinessEvaluator } from "./application/course-readiness-evaluator";
import { LearningReadinessQueryService } from "./application/learning-readiness-query.service";
import { LearningReadinessQuery } from "./application/learning-readiness.query";
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
  providers: [
    CourseReadinessEvaluator,
    LearningReadinessQueryService,
    LearningReadinessApplicationService,
    {
      provide: LearningReadinessQuery,
      useExisting: LearningReadinessQueryService
    }
  ],
  exports: [LearningReadinessQuery]
})
export class LearningReadinessModule {}
