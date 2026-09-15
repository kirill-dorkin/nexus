import { Controller, Get, Param } from "@nestjs/common";
import { uuidSchema, type LearnerSkillProgressReadModel } from "@platform/contracts";

import { parseRequest } from "../../http/validation";
import { LearnerSkillProgressApplicationService } from "./application/learner-skill-progress.service";

@Controller("organizations/:organizationId/enrollments/:enrollmentId/skill-progress")
export class LearnerSkillProgressController {
  constructor(
    private readonly learnerSkillProgress: LearnerSkillProgressApplicationService
  ) {}

  @Get()
  getEnrollmentSkillProgress(
    @Param("organizationId") organizationId: string,
    @Param("enrollmentId") enrollmentId: string
  ): Promise<LearnerSkillProgressReadModel> {
    return this.learnerSkillProgress.getEnrollmentSkillProgress(
      parseRequest(uuidSchema, organizationId),
      parseRequest(uuidSchema, enrollmentId)
    );
  }
}
