import type { GuidedBuildExposure } from "@platform/contracts";
import type { DatabaseTransaction } from "@platform/database";

export type NewGuidanceExposure =
  | Readonly<{
      id: string;
      organizationId: string;
      enrollmentId: string;
      attemptId: string;
      activityVersionId: string;
      kind: "hint";
      stepKey: string;
      hintKey: string;
      idempotencyKey: string;
      revealedByUserId: string;
    }>
  | Readonly<{
      id: string;
      organizationId: string;
      enrollmentId: string;
      attemptId: string;
      activityVersionId: string;
      kind: "professional_solution";
      solutionKey: string;
      idempotencyKey: string;
      revealedByUserId: string;
    }>;

export abstract class GuidanceExposureRepository {
  abstract lockAttemptScope(
    transaction: DatabaseTransaction,
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
  abstract create(
    transaction: DatabaseTransaction,
    exposure: NewGuidanceExposure
  ): Promise<GuidedBuildExposure>;
}
