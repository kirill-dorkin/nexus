import { Controller, Get, Param } from "@nestjs/common";
import { uuidSchema, type LearnerRunnerReadModel } from "@platform/contracts";

import { parseRequest } from "../../http/validation";
import { LearnerRunnerApplicationService } from "./application/learner-runner.service";

@Controller("organizations/:organizationId/enrollments/:enrollmentId/runner")
export class LearnerRunnerController {
  constructor(private readonly runner: LearnerRunnerApplicationService) {}

  @Get()
  getRunnerReadModel(
    @Param("organizationId") organizationId: string,
    @Param("enrollmentId") enrollmentId: string
  ): Promise<LearnerRunnerReadModel> {
    return this.runner.getRunnerReadModel(
      parseRequest(uuidSchema, organizationId),
      parseRequest(uuidSchema, enrollmentId)
    );
  }
}
