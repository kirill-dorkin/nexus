import { ConflictException, Injectable } from "@nestjs/common";
import type {
  Attempt,
  Evidence,
  GuidedBuildExposure,
  Submission,
  ValidationResult
} from "@platform/contracts";
import type { DatabaseTransaction } from "@platform/database";

import { LearningEventRepository } from "./learning-event.repository";
import { LearningEventSink } from "./learning-event.sink";

function requireSameOrganization(
  attempt: Attempt,
  child: { organizationId: string }
): void {
  if (attempt.organizationId !== child.organizationId) {
    throw new ConflictException("LearningEvent source must remain in one organization.");
  }
}

const noGuidance = {
  guidanceExposureId: null,
  guidanceStepKey: null,
  guidanceHintKey: null,
  guidanceSolutionKey: null
} as const;

const noEvidence = {
  validationResultId: null,
  evidenceId: null,
  skillId: null,
  outcome: null,
  score: null,
  evidenceKind: null,
  evidenceSourceType: null
} as const;

@Injectable()
export class LearningEventWriter extends LearningEventSink {
  constructor(private readonly events: LearningEventRepository) {
    super();
  }

  appendAttemptStarted(
    transaction: DatabaseTransaction,
    learnerUserId: string,
    attempt: Attempt
  ): Promise<void> {
    return this.events.append(transaction, {
      organizationId: attempt.organizationId,
      learnerUserId,
      enrollmentId: attempt.enrollmentId,
      eventName: "attempt.started",
      attemptId: attempt.id,
      activityVersionId: attempt.activityVersionId,
      attemptNumber: attempt.attemptNumber,
      submissionId: null,
      ...noEvidence,
      ...noGuidance,
      occurredAt: attempt.startedAt
    });
  }

  appendSubmissionSubmitted(
    transaction: DatabaseTransaction,
    learnerUserId: string,
    attempt: Attempt,
    submission: Submission
  ): Promise<void> {
    requireSameOrganization(attempt, submission);
    if (submission.attemptId !== attempt.id) {
      throw new ConflictException("Submission LearningEvent must match its Attempt.");
    }
    return this.events.append(transaction, {
      organizationId: attempt.organizationId,
      learnerUserId,
      enrollmentId: attempt.enrollmentId,
      eventName: "submission.submitted",
      attemptId: attempt.id,
      activityVersionId: attempt.activityVersionId,
      attemptNumber: attempt.attemptNumber,
      submissionId: submission.id,
      ...noEvidence,
      ...noGuidance,
      occurredAt: submission.submittedAt
    });
  }

  appendValidationResultRecorded(
    transaction: DatabaseTransaction,
    learnerUserId: string,
    attempt: Attempt,
    result: ValidationResult
  ): Promise<void> {
    requireSameOrganization(attempt, result);
    if (result.status !== "completed" || result.outcome === null) {
      throw new ConflictException("Only completed ValidationResults are learner LearningEvents.");
    }
    if (result.activityVersionId !== attempt.activityVersionId) {
      throw new ConflictException("ValidationResult LearningEvent must match its Attempt ActivityVersion.");
    }
    return this.events.append(transaction, {
      organizationId: attempt.organizationId,
      learnerUserId,
      enrollmentId: attempt.enrollmentId,
      eventName: "validation.result_recorded",
      attemptId: attempt.id,
      activityVersionId: attempt.activityVersionId,
      attemptNumber: attempt.attemptNumber,
      submissionId: result.submissionId,
      validationResultId: result.id,
      evidenceId: null,
      skillId: null,
      outcome: result.outcome,
      score: result.score,
      evidenceKind: null,
      evidenceSourceType: null,
      ...noGuidance,
      occurredAt: result.recordedAt
    });
  }

  appendEvidenceRecorded(
    transaction: DatabaseTransaction,
    learnerUserId: string,
    attempt: Attempt,
    evidence: Evidence
  ): Promise<void> {
    requireSameOrganization(attempt, evidence);
    if (evidence.attemptId !== attempt.id) {
      throw new ConflictException("Evidence LearningEvent must match its Attempt.");
    }
    return this.events.append(transaction, {
      organizationId: attempt.organizationId,
      learnerUserId,
      enrollmentId: attempt.enrollmentId,
      eventName: "evidence.recorded",
      attemptId: attempt.id,
      activityVersionId: attempt.activityVersionId,
      attemptNumber: attempt.attemptNumber,
      submissionId: evidence.submissionId,
      validationResultId: evidence.sourceValidationResultId,
      evidenceId: evidence.id,
      skillId: evidence.skillId,
      outcome: null,
      score: evidence.score,
      evidenceKind: evidence.kind,
      evidenceSourceType: evidence.sourceType,
      ...noGuidance,
      occurredAt: evidence.createdAt
    });
  }

  appendGuidanceHintRevealed(
    transaction: DatabaseTransaction,
    learnerUserId: string,
    attempt: Attempt,
    exposure: Extract<GuidedBuildExposure, { kind: "hint" }>
  ): Promise<void> {
    this.requireExposure(attempt, exposure);
    return this.events.append(transaction, {
      organizationId: attempt.organizationId,
      learnerUserId,
      enrollmentId: attempt.enrollmentId,
      eventName: "guidance.hint_revealed",
      attemptId: attempt.id,
      activityVersionId: attempt.activityVersionId,
      attemptNumber: attempt.attemptNumber,
      submissionId: null,
      ...noEvidence,
      guidanceExposureId: exposure.id,
      guidanceStepKey: exposure.stepKey,
      guidanceHintKey: exposure.hintKey,
      guidanceSolutionKey: null,
      occurredAt: exposure.revealedAt
    });
  }

  appendGuidanceSolutionRevealed(
    transaction: DatabaseTransaction,
    learnerUserId: string,
    attempt: Attempt,
    exposure: Extract<GuidedBuildExposure, { kind: "professional_solution" }>
  ): Promise<void> {
    this.requireExposure(attempt, exposure);
    return this.events.append(transaction, {
      organizationId: attempt.organizationId,
      learnerUserId,
      enrollmentId: attempt.enrollmentId,
      eventName: "guidance.solution_revealed",
      attemptId: attempt.id,
      activityVersionId: attempt.activityVersionId,
      attemptNumber: attempt.attemptNumber,
      submissionId: null,
      ...noEvidence,
      guidanceExposureId: exposure.id,
      guidanceStepKey: null,
      guidanceHintKey: null,
      guidanceSolutionKey: exposure.solutionKey,
      occurredAt: exposure.revealedAt
    });
  }

  private requireExposure(attempt: Attempt, exposure: GuidedBuildExposure): void {
    requireSameOrganization(attempt, exposure);
    if (
      exposure.attemptId !== attempt.id ||
      exposure.enrollmentId !== attempt.enrollmentId ||
      exposure.activityVersionId !== attempt.activityVersionId
    ) {
      throw new ConflictException("Guidance LearningEvent must match its Attempt.");
    }
  }
}
