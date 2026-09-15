import type {
  Attempt,
  Evidence,
  GuidedBuildExposure,
  Submission,
  ValidationResult
} from "@platform/contracts";
import type { DatabaseTransaction } from "@platform/database";

export abstract class LearningEventSink {
  abstract appendAttemptStarted(
    transaction: DatabaseTransaction,
    learnerUserId: string,
    attempt: Attempt
  ): Promise<void>;

  abstract appendSubmissionSubmitted(
    transaction: DatabaseTransaction,
    learnerUserId: string,
    attempt: Attempt,
    submission: Submission
  ): Promise<void>;

  abstract appendValidationResultRecorded(
    transaction: DatabaseTransaction,
    learnerUserId: string,
    attempt: Attempt,
    result: ValidationResult
  ): Promise<void>;

  abstract appendEvidenceRecorded(
    transaction: DatabaseTransaction,
    learnerUserId: string,
    attempt: Attempt,
    evidence: Evidence
  ): Promise<void>;

  abstract appendGuidanceHintRevealed(
    transaction: DatabaseTransaction,
    learnerUserId: string,
    attempt: Attempt,
    exposure: Extract<GuidedBuildExposure, { kind: "hint" }>
  ): Promise<void>;

  abstract appendGuidanceSolutionRevealed(
    transaction: DatabaseTransaction,
    learnerUserId: string,
    attempt: Attempt,
    exposure: Extract<GuidedBuildExposure, { kind: "professional_solution" }>
  ): Promise<void>;
}
