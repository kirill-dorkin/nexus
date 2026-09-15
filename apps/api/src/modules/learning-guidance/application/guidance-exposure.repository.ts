import type { GuidedBuildExposure } from "@platform/contracts";
import type { DatabaseTransaction } from "@platform/database";

export type NewHintExposure = Readonly<{
  id: string;
  organizationId: string;
  enrollmentId: string;
  attemptId: string;
  activityVersionId: string;
  stepKey: string;
  hintKey: string;
  idempotencyKey: string;
}>;

export type NewSolutionExposure = Readonly<{
  id: string;
  organizationId: string;
  enrollmentId: string;
  attemptId: string;
  activityVersionId: string;
  solutionKey: string;
  idempotencyKey: string;
}>;

export abstract class GuidanceExposureRepository {
  abstract lockAttempt(
    transaction: DatabaseTransaction,
    organizationId: string,
    attemptId: string
  ): Promise<void>;

  abstract listForAttempt(
    transaction: DatabaseTransaction,
    organizationId: string,
    attemptId: string
  ): Promise<readonly GuidedBuildExposure[]>;

  abstract findByIdempotencyKey(
    transaction: DatabaseTransaction,
    organizationId: string,
    attemptId: string,
    idempotencyKey: string
  ): Promise<GuidedBuildExposure | null>;

  abstract createHint(
    transaction: DatabaseTransaction,
    exposure: NewHintExposure
  ): Promise<GuidedBuildExposure>;

  abstract createSolution(
    transaction: DatabaseTransaction,
    exposure: NewSolutionExposure
  ): Promise<GuidedBuildExposure>;
}
