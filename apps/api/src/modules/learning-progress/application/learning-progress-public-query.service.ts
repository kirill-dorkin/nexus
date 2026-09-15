import { Injectable, NotFoundException } from "@nestjs/common";
import type { DatabaseTransaction } from "@platform/database";

import {
  LearningProgressQuery,
  type ActivityAttemptCount,
  type AttemptGuidanceContext,
  type SubmissionValidationContext
} from "./learning-progress.query";
import { LearningProgressRepository } from "./learning-progress.repository";

@Injectable()
export class LearningProgressPublicQueryService extends LearningProgressQuery {
  constructor(private readonly progress: LearningProgressRepository) {
    super();
  }

  listActivityAttemptCounts(
    transaction: DatabaseTransaction,
    organizationId: string,
    enrollmentId: string,
    activityVersionIds: readonly string[]
  ): Promise<readonly ActivityAttemptCount[]> {
    return this.progress.listActivityAttemptCounts(
      transaction,
      organizationId,
      enrollmentId,
      activityVersionIds
    );
  }

  async requireSubmissionForValidation(
    transaction: DatabaseTransaction,
    organizationId: string,
    submissionId: string
  ): Promise<SubmissionValidationContext> {
    const context = await this.progress.findSubmissionContext(
      transaction,
      organizationId,
      submissionId
    );
    if (context === null) {
      throw new NotFoundException("Submission not found.");
    }
    return context;
  }

  async requireAttemptForGuidance(
    transaction: DatabaseTransaction,
    organizationId: string,
    attemptId: string
  ): Promise<AttemptGuidanceContext> {
    const context = await this.progress.findAttemptContext(
      transaction,
      organizationId,
      attemptId
    );
    if (context === null) {
      throw new NotFoundException("Attempt not found.");
    }
    const submission = await this.progress.findSubmissionByAttempt(
      transaction,
      organizationId,
      attemptId
    );
    return {
      ...context,
      submissionExists: submission !== null
    };
  }
}
