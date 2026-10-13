import { Controller, Get, Param } from "@nestjs/common";
import {
  courseReadinessDecisionSchema,
  offeringReadinessOverviewSchema,
  uuidSchema,
  type CourseReadinessDecision,
  type OfferingReadinessOverview
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

@Controller("organizations/:organizationId/offerings/:offeringId/readiness")
export class OfferingReadinessController {
  constructor(
    private readonly readiness: LearningReadinessApplicationService
  ) {}

  @Get()
  async getOfferingReadiness(
    @Param("organizationId") organizationId: string,
    @Param("offeringId") offeringId: string
  ): Promise<OfferingReadinessOverview> {
    const overview = await this.readiness.getOfferingReadiness(
      parseRequest(uuidSchema, organizationId),
      parseRequest(uuidSchema, offeringId)
    );
    return offeringReadinessOverviewSchema.parse(overview);
  }
}
