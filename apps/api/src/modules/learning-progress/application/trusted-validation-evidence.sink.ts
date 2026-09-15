import type {
  CourseVersionActivity,
  Evidence,
  ValidationResult
} from "@platform/contracts";

export abstract class TrustedValidationEvidenceSink {
  abstract materializeTrustedValidationEvidence(
    organizationId: string,
    result: ValidationResult,
    activity: CourseVersionActivity
  ): Promise<readonly Evidence[]>;
}
