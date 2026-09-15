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
  createSubmissionRequestSchema,
  uuidSchema,
  type Attempt,
  type Evidence,
  type Submission
} from "@platform/contracts";

import { parseRequest } from "../../http/validation";
import { LearningProgressApplicationService } from "./application/learning-progress.service";

@Controller("organizations/:organizationId")
export class LearningProgressController {
  constructor(private readonly progress: LearningProgressApplicationService) {}

  @Post("enrollments/:enrollmentId/activities/:activityId/attempts")
  @HttpCode(HttpStatus.CREATED)
  createAttempt(
    @Param("organizationId") organizationId: string,
    @Param("enrollmentId") enrollmentId: string,
    @Param("activityId") activityId: string,
    @Body() body: unknown
  ): Promise<Attempt> {
    return this.progress.createAttempt(
      parseRequest(uuidSchema, organizationId),
      parseRequest(uuidSchema, enrollmentId),
      parseRequest(uuidSchema, activityId),
      parseRequest(createAttemptRequestSchema, body)
    );
  }

  @Post("attempts/:attemptId/submissions")
  @HttpCode(HttpStatus.CREATED)
  submitAttempt(
    @Param("organizationId") organizationId: string,
    @Param("attemptId") attemptId: string,
    @Body() body: unknown
  ): Promise<Submission> {
    return this.progress.submitAttempt(
      parseRequest(uuidSchema, organizationId),
      parseRequest(uuidSchema, attemptId),
      parseRequest(createSubmissionRequestSchema, body)
    );
  }

  @Post("submissions/:submissionId/evidence")
  @HttpCode(HttpStatus.CREATED)
  recordEvidence(
    @Param("organizationId") organizationId: string,
    @Param("submissionId") submissionId: string,
    @Body() body: unknown
  ): Promise<Evidence> {
    return this.progress.recordEvidence(
      parseRequest(uuidSchema, organizationId),
      parseRequest(uuidSchema, submissionId),
      parseRequest(createEvidenceRequestSchema, body)
    );
  }

  @Post("attempts/:attemptId/evidence")
  @HttpCode(HttpStatus.CREATED)
  recordEvidenceForAttempt(
    @Param("organizationId") organizationId: string,
    @Param("attemptId") attemptId: string,
    @Body() body: unknown
  ): Promise<Evidence> {
    return this.progress.recordEvidenceForAttempt(
      parseRequest(uuidSchema, organizationId),
      parseRequest(uuidSchema, attemptId),
      parseRequest(createEvidenceRequestSchema, body)
    );
  }
}
