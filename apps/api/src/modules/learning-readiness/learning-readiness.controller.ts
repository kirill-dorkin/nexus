import { Controller, Get, Param } from "@nestjs/common";
import {
  courseReadinessDecisionSchema,
  uuidSchema,
  type CourseReadinessDecision
} from "@platform/contracts";

import { parseRequest } from "../../http/validation";
import { LearningReadinessApplicationService } from "./application/learning-readiness.service";

@Controller("organizations/:organizationId/enrollments/:enrollmentId/readiness")
export class LearningReadinessController {
  constructor(
    private readonly readiness: LearningReadinessApplicationService
  ) {}

  @Get()
  async getCourseReadiness(
    @Param("organizationId") organizationId: string,
    @Param("enrollmentId") enrollmentId: string
  ): Promise<CourseReadinessDecision> {
    const decision = await this.readiness.getCourseReadiness(
      parseRequest(uuidSchema, organizationId),
      parseRequest(uuidSchema, enrollmentId)
    );
    return courseReadinessDecisionSchema.parse(decision);
  }
}
