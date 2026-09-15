import type {
  CourseVersionActivity,
  Evidence,
  ValidationResult
} from "@platform/contracts";
import type { DatabaseTransaction } from "@platform/database";

export abstract class TrustedValidationEvidenceSink {
  abstract materializeTrustedValidationEvidence(
    transaction: DatabaseTransaction,
    organizationId: string,
    result: ValidationResult,
    activity: CourseVersionActivity
  ): Promise<readonly Evidence[]>;
}
