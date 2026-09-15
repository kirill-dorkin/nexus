import { ConflictException, Injectable } from "@nestjs/common";
import type { Attempt, Evidence, GuidedBuildExposure, Submission, ValidationResult } from "@platform/contracts";
import type { DatabaseTransaction } from "@platform/database";
import { LearningEventRepository, type NewLearningEvent } from "./learning-event.repository";
import { LearningEventSink } from "./learning-event.sink";

function requireSameOrganization(attempt: Attempt, child: { organizationId: string }): void {
  if (attempt.organizationId !== child.organizationId) throw new ConflictException("LearningEvent source must remain in one organization.");
}
function base(attempt: Attempt, learnerUserId: string): Pick<NewLearningEvent, "organizationId" | "learnerUserId" | "enrollmentId" | "attemptId" | "activityVersionId" | "attemptNumber"> {
  return { organizationId: attempt.organizationId, learnerUserId, enrollmentId: attempt.enrollmentId, attemptId: attempt.id, activityVersionId: attempt.activityVersionId, attemptNumber: attempt.attemptNumber };
}
function empty(): Pick<NewLearningEvent, "submissionId" | "validationResultId" | "evidenceId" | "skillId" | "outcome" | "score" | "evidenceKind" | "evidenceSourceType" | "guidanceExposureId" | "guidanceStepKey" | "guidanceHintKey" | "guidanceSolutionKey"> {
  return { submissionId: null, validationResultId: null, evidenceId: null, skillId: null, outcome: null, score: null, evidenceKind: null, evidenceSourceType: null, guidanceExposureId: null, guidanceStepKey: null, guidanceHintKey: null, guidanceSolutionKey: null };
}

@Injectable()
export class LearningEventWriter extends LearningEventSink {
  constructor(private readonly events: LearningEventRepository) { super(); }
  appendAttemptStarted(transaction: DatabaseTransaction, learnerUserId: string, attempt: Attempt): Promise<void> {
    return this.events.append(transaction, { ...base(attempt, learnerUserId), ...empty(), eventName: "attempt.started", occurredAt: attempt.startedAt });
  }
  appendGuidanceHintRevealed(transaction: DatabaseTransaction, learnerUserId: string, attempt: Attempt, exposure: Extract<GuidedBuildExposure, { kind: "hint" }>): Promise<void> {
    requireSameOrganization(attempt, exposure);
    if (exposure.attemptId !== attempt.id || exposure.activityVersionId !== attempt.activityVersionId || exposure.enrollmentId !== attempt.enrollmentId) throw new ConflictException("Hint LearningEvent must match its Attempt.");
    return this.events.append(transaction, { ...base(attempt, learnerUserId), ...empty(), eventName: "guidance.hint_revealed", guidanceExposureId: exposure.id, guidanceStepKey: exposure.stepKey, guidanceHintKey: exposure.hintKey, occurredAt: exposure.revealedAt });
  }
  appendSubmissionSubmitted(transaction: DatabaseTransaction, learnerUserId: string, attempt: Attempt, submission: Submission): Promise<void> {
    requireSameOrganization(attempt, submission); if (submission.attemptId !== attempt.id) throw new ConflictException("Submission LearningEvent must match its Attempt.");
    return this.events.append(transaction, { ...base(attempt, learnerUserId), ...empty(), eventName: "submission.submitted", submissionId: submission.id, occurredAt: submission.submittedAt });
  }
  appendGuidanceSolutionRevealed(transaction: DatabaseTransaction, learnerUserId: string, attempt: Attempt, exposure: Extract<GuidedBuildExposure, { kind: "professional_solution" }>): Promise<void> {
    requireSameOrganization(attempt, exposure);
    if (exposure.attemptId !== attempt.id || exposure.activityVersionId !== attempt.activityVersionId || exposure.enrollmentId !== attempt.enrollmentId) throw new ConflictException("Solution LearningEvent must match its Attempt.");
    return this.events.append(transaction, { ...base(attempt, learnerUserId), ...empty(), eventName: "guidance.solution_revealed", guidanceExposureId: exposure.id, guidanceSolutionKey: exposure.solutionKey, occurredAt: exposure.revealedAt });
  }
  appendValidationResultRecorded(transaction: DatabaseTransaction, learnerUserId: string, attempt: Attempt, result: ValidationResult): Promise<void> {
    requireSameOrganization(attempt, result);
    if (result.status !== "completed" || result.outcome === null) throw new ConflictException("Only completed ValidationResults are learner LearningEvents.");
    if (result.activityVersionId !== attempt.activityVersionId) throw new ConflictException("ValidationResult LearningEvent must match its Attempt ActivityVersion.");
    return this.events.append(transaction, { ...base(attempt, learnerUserId), ...empty(), eventName: "validation.result_recorded", submissionId: result.submissionId, validationResultId: result.id, outcome: result.outcome, score: result.score, occurredAt: result.recordedAt });
  }
  appendEvidenceRecorded(transaction: DatabaseTransaction, learnerUserId: string, attempt: Attempt, evidence: Evidence): Promise<void> {
    requireSameOrganization(attempt, evidence); if (evidence.attemptId !== attempt.id) throw new ConflictException("Evidence LearningEvent must match its Attempt.");
    return this.events.append(transaction, { ...base(attempt, learnerUserId), ...empty(), eventName: "evidence.recorded", submissionId: evidence.submissionId, validationResultId: evidence.sourceValidationResultId, evidenceId: evidence.id, skillId: evidence.skillId, score: evidence.score, evidenceKind: evidence.kind, evidenceSourceType: evidence.sourceType, occurredAt: evidence.createdAt });
  }
}
