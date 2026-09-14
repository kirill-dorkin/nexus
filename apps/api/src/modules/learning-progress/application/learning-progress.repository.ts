import type { Attempt, Evidence } from "@platform/contracts";
import type { DatabaseTransaction } from "@platform/database";

import type { ActivityAttemptCount } from "./learning-progress.query";

export type NewAttempt = Readonly<{
  id: string;
  organizationId: string;
  enrollmentId: string;
  activityVersionId: string;
  submission: Readonly<Record<string, unknown>>;
}>;

export type NewEvidence = Readonly<{
  id: string;
  organizationId: string;
  attemptId: string;
  skillId: string;
  kind: string;
  score: number | null;
  payload: Readonly<Record<string, unknown>>;
  recordedByUserId: string | null;
}>;

export type AttemptContext = Readonly<{
  attempt: Attempt;
  offeringId: string;
  learnerUserId: string;
}>;

export abstract class LearningProgressRepository {
  abstract createAttempt(
    transaction: DatabaseTransaction,
    attempt: NewAttempt
  ): Promise<Attempt>;

  abstract findAttemptContext(
    transaction: DatabaseTransaction,
    organizationId: string,
    attemptId: string
  ): Promise<AttemptContext | null>;

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
}
