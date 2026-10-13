import { Module } from "@nestjs/common";

import { AuthorizationModule } from "../authorization/authorization.module";
import { IdentityModule } from "../identity/identity.module";
import { LearningContentModule } from "../learning-content/learning-content.module";
import { LearningDeliveryModule } from "../learning-delivery/learning-delivery.module";
import { LearningProgressModule } from "../learning-progress/learning-progress.module";
import { LearningRecommendationsApplicationService } from "./application/learning-recommendations.service";
import { MisconceptionSignalQuery } from "./application/misconception-signal.query";
import { MisconceptionSignalApplicationService } from "./application/misconception-signal.service";
import { LearningRecommendationsController } from "./learning-recommendations.controller";

@Module({
  imports: [
    IdentityModule,
    AuthorizationModule,
    LearningContentModule,
    LearningDeliveryModule,
    LearningProgressModule
  ],
  controllers: [LearningRecommendationsController],
  providers: [
    LearningRecommendationsApplicationService,
    MisconceptionSignalApplicationService,
    {
      provide: MisconceptionSignalQuery,
      useExisting: MisconceptionSignalApplicationService
    }
  ],
  exports: [MisconceptionSignalQuery]
})
export class LearningRecommendationsModule {}
