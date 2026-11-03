import { Controller, Get, Param } from "@nestjs/common";
import {
  uuidSchema,
  type NextLearningRecommendation
} from "@platform/contracts";

import { parseRequest } from "../../http/validation";
import { LearningRecommendationsApplicationService } from "./application/learning-recommendations.service";

@Controller(
  "organizations/:organizationId/enrollments/:enrollmentId/recommendation"
)
export class LearningRecommendationsController {
  constructor(
    private readonly recommendations: LearningRecommendationsApplicationService
  ) {}

  @Get()
  getNextRecommendation(
    @Param("organizationId") organizationId: string,
    @Param("enrollmentId") enrollmentId: string
  ): Promise<NextLearningRecommendation> {
    return this.recommendations.getNextRecommendation(
      parseRequest(uuidSchema, organizationId),
      parseRequest(uuidSchema, enrollmentId)
    );
  }
}
