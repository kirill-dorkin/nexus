import { Module } from "@nestjs/common";

import { LearningAnalyticsController } from "./learning-analytics.controller";
import {
  LearningAnalyticsRepository,
  PostgresLearningAnalyticsRepository
} from "./learning-analytics.repository";
import { LearningAnalyticsService } from "./learning-analytics.service";

/** Learning analytics (ADR-0084): owns the `analytics` schema; reads no other module's tables. */
@Module({
  controllers: [LearningAnalyticsController],
  providers: [
    LearningAnalyticsService,
    {
      provide: LearningAnalyticsRepository,
      useClass: PostgresLearningAnalyticsRepository
    }
  ]
})
export class LearningAnalyticsModule {}
