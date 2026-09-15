import type {
  Attempt,
  Evidence,
  EvidenceSourceType,
  Submission
} from "@platform/contracts";
import type { DatabaseTransaction } from "@platform/database";

import type { ActivityAttemptCount } from "./learning-progress.query";

export type NewAttempt = Readonly<{
  id: string;
  organizationId: string;
  enrollmentId: string;
  activityVersionId: string;
}>;

export type NewSubmission = Readonly<{
  id: string;
  organizationId: string;
  attemptId: string;
  payload: Readonly<Record<string, unknown>>;
  submittedByUserId: string;
}>;

export type NewEvidence = Readonly<{
  id: string;
  organizationId: string;
  attemptId: string;
  submissionId: string;
  skillId: string;
  kind: string;
  score: number | null;
  payload: Readonly<Record<string, unknown>>;
  recordedByUserId: string | null;
  sourceType: EvidenceSourceType;
  sourceValidationResultId: string | null;
}>;

export type AttemptContext = Readonly<{
  attempt: Attempt;
  offeringId: string;
  learnerUserId: string;
}>;

export type SubmissionContext = Readonly<{
  submission: Submission;
  attempt: Attempt;
  offeringId: string;
  learnerUserId: string;
}>;

export type CreateValidationEvidenceOutcome = Readonly<{
  evidence: Evidence;
  created: boolean;
}>;

export abstract class LearningProgressRepository {
  abstract createAttempt(
    transaction: DatabaseTransaction,
    attempt: NewAttempt
  ): Promise<Attempt>;

  abstract createSubmission(
    transaction: DatabaseTransaction,
    submission: NewSubmission
  ): Promise<Submission>;

  abstract findAttemptContext(
    transaction: DatabaseTransaction,
    organizationId: string,
    attemptId: string
  ): Promise<AttemptContext | null>;

  abstract findSubmissionContext(
    transaction: DatabaseTransaction,
    organizationId: string,
    submissionId: string
  ): Promise<SubmissionContext | null>;

  abstract findSubmissionByAttempt(
    transaction: DatabaseTransaction,
    organizationId: string,
    attemptId: string
  ): Promise<Submission | null>;

  abstract listActivityAttemptCounts(
    transaction: DatabaseTransaction,
    organizationId: string,
    enrollmentId: string,
    activityVersionIds: readonly string[]
  ): Promise<readonly ActivityAttemptCount[]>;

  abstract createEvidence(
    transaction: DatabaseTransaction,
    evidence: NewEvidence
  ): Promise<Evidence>;

  abstract createOrFindValidationEvidence(
    transaction: DatabaseTransaction,
    evidence: NewEvidence
  ): Promise<CreateValidationEvidenceOutcome>;
}
