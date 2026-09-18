import type { Attempt, Submission } from "@platform/contracts";
import type { DatabaseTransaction } from "@platform/database";

export type ActivityAttemptCount = Readonly<{
  activityVersionId: string;
  attemptCount: number;
}>;

export type TrustedValidationEvidenceObservation = Readonly<{
  evidenceId: string;
  attemptId: string;
  skillId: string;
  outcome: "passed" | "failed";
  createdAt: string;
}>;

export type ReadinessEvidenceSummary = Readonly<{
  skillId: string;
  scoredAttemptCount: number;
  lastScoredEvidenceAt: string;
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

export abstract class TrustedValidationEvidenceQuery {
  abstract listObservations(
    transaction: DatabaseTransaction,
    organizationId: string,
    learnerUserId: string,
    skillIds: readonly string[]
  ): Promise<readonly TrustedValidationEvidenceObservation[]>;
}


export abstract class ReadinessEvidenceQuery {
  abstract listScoredAttemptSummaries(
    transaction: DatabaseTransaction,
    organizationId: string,
    learnerUserId: string,
    skillIds: readonly string[]
  ): Promise<readonly ReadinessEvidenceSummary[]>;
}
