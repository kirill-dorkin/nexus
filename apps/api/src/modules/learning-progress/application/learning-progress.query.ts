import type { Attempt, Submission } from "@platform/contracts";
import type { DatabaseTransaction } from "@platform/database";

export type ActivityAttemptCount = Readonly<{
  activityVersionId: string;
  attemptCount: number;
}>;

export type SubmissionValidationContext = Readonly<{
  submission: Submission;
  attempt: Attempt;
  offeringId: string;
  learnerUserId: string;
}>;

export abstract class LearningProgressQuery {
  abstract listActivityAttemptCounts(
    transaction: DatabaseTransaction,
    organizationId: string,
    enrollmentId: string,
    activityVersionIds: readonly string[]
  ): Promise<readonly ActivityAttemptCount[]>;

  abstract requireSubmissionForValidation(
    transaction: DatabaseTransaction,
    organizationId: string,
    submissionId: string
  ): Promise<SubmissionValidationContext>;
}
