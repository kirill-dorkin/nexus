import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Param,
  Post
} from "@nestjs/common";
import {
  createAttemptRequestSchema,
  createEvidenceRequestSchema,
  uuidSchema,
  type Attempt,
  type Evidence
} from "@platform/contracts";

import { parseRequest } from "../../http/validation";
import { LearningProgressApplicationService } from "./application/learning-progress.service";

@Controller("organizations/:organizationId")
export class LearningProgressController {
  constructor(private readonly progress: LearningProgressApplicationService) {}

  @Post("enrollments/:enrollmentId/activities/:activityId/attempts")
  @HttpCode(HttpStatus.CREATED)
  submitAttempt(
    @Param("organizationId") organizationId: string,
    @Param("enrollmentId") enrollmentId: string,
    @Param("activityId") activityId: string,
    @Body() body: unknown
  ): Promise<Attempt> {
    return this.progress.submitAttempt(
      parseRequest(uuidSchema, organizationId),
      parseRequest(uuidSchema, enrollmentId),
      parseRequest(uuidSchema, activityId),
      parseRequest(createAttemptRequestSchema, body)
    );
  }

  @Post("attempts/:attemptId/evidence")
  @HttpCode(HttpStatus.CREATED)
  recordEvidence(
    @Param("organizationId") organizationId: string,
    @Param("attemptId") attemptId: string,
    @Body() body: unknown
  ): Promise<Evidence> {
    return this.progress.recordEvidence(
      parseRequest(uuidSchema, organizationId),
      parseRequest(uuidSchema, attemptId),
      parseRequest(createEvidenceRequestSchema, body)
    );
  }
}
