import type {
  ValidationEvidenceTrust,
  ValidationOutcome,
  ValidationResult,
  ValidationResultStatus
} from "@platform/contracts";
import type { DatabaseTransaction } from "@platform/database";

export type NewValidationResult = Readonly<{
  id: string;
  organizationId: string;
  submissionId: string;
  activityVersionId: string;
  validatorKey: string;
  validatorVersion: number;
  validatorConfig: Readonly<Record<string, unknown>>;
  idempotencyKey: string;
  status: ValidationResultStatus;
  outcome: ValidationOutcome | null;
  score: number | null;
  evidenceTrust: ValidationEvidenceTrust;
  payload: Readonly<Record<string, unknown>>;
  recordedByUserId: string | null;
}>;

export type CreateValidationResultOutcome = Readonly<{
  result: ValidationResult;
  created: boolean;
}>;

export abstract class ValidationRepository {
  abstract createOrFind(
    transaction: DatabaseTransaction,
    result: NewValidationResult
  ): Promise<CreateValidationResultOutcome>;
}
