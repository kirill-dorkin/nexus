import type { LearningEvent } from "@platform/contracts";
import type { DatabaseTransaction } from "@platform/database";

export type LearningEventCursorPosition = Readonly<{ occurredAt: string; eventOrder: number; id: string }>;
export type NewLearningEvent = Readonly<{
  organizationId: string;
  learnerUserId: string;
  enrollmentId: string;
  eventName: LearningEvent["eventName"];
  attemptId: string;
  activityVersionId: string;
  attemptNumber: number;
  submissionId: string | null;
  validationResultId: string | null;
  evidenceId: string | null;
  skillId: string | null;
  outcome: "passed" | "failed" | "needs_review" | null;
  score: number | null;
  evidenceKind: string | null;
  evidenceSourceType: "manual" | "validation_result" | null;
  guidanceExposureId: string | null;
  guidanceStepKey: string | null;
  guidanceHintKey: string | null;
  guidanceSolutionKey: string | null;
  occurredAt: string;
}>;
export type LearningEventPageRow = Readonly<{ event: LearningEvent; position: LearningEventCursorPosition }>;
export abstract class LearningEventRepository {
  abstract append(transaction: DatabaseTransaction, event: NewLearningEvent): Promise<void>;
  abstract listForEnrollment(transaction: DatabaseTransaction, organizationId: string, enrollmentId: string, before: LearningEventCursorPosition | null, limit: number): Promise<readonly LearningEventPageRow[]>;
}
