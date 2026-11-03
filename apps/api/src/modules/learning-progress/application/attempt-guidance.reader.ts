import { Injectable, NotFoundException } from "@nestjs/common";
import type { DatabaseTransaction } from "@platform/database";
import {
  AttemptGuidanceQuery,
  type AttemptGuidanceContext
} from "./attempt-guidance.query";
import { LearningProgressRepository } from "./learning-progress.repository";

@Injectable()
export class AttemptGuidanceReader extends AttemptGuidanceQuery {
  constructor(private readonly progress: LearningProgressRepository) {
    super();
  }

  async requireAttemptGuidanceContext(
    transaction: DatabaseTransaction,
    organizationId: string,
    attemptId: string
  ): Promise<AttemptGuidanceContext> {
    const context = await this.progress.findAttemptContext(
      transaction,
      organizationId,
      attemptId
    );
    if (context === null) throw new NotFoundException("Attempt not found.");
    const submission = await this.progress.findSubmissionByAttempt(
      transaction,
      organizationId,
      attemptId
    );
    return { ...context, submission };
  }
}
