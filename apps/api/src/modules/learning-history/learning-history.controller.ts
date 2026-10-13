import { Controller, Get, Param, Query } from "@nestjs/common";
import {
  learningEventHistoryQuerySchema,
  uuidSchema,
  type LearningEventHistoryPage
} from "@platform/contracts";

import { parseRequest } from "../../http/validation";
import { LearningHistoryApplicationService } from "./application/learning-history.service";

@Controller("organizations/:organizationId/enrollments/:enrollmentId/learning-events")
export class LearningHistoryController {
  constructor(private readonly history: LearningHistoryApplicationService) {}

  @Get()
  listEnrollmentHistory(
    @Param("organizationId") organizationId: string,
    @Param("enrollmentId") enrollmentId: string,
    @Query() query: unknown
  ): Promise<LearningEventHistoryPage> {
    return this.history.listEnrollmentHistory(
      parseRequest(uuidSchema, organizationId),
      parseRequest(uuidSchema, enrollmentId),
      parseRequest(learningEventHistoryQuerySchema, query)
    );
  }
}
