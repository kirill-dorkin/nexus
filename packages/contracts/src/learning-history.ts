import { z } from "zod";

import { resourceSlugSchema, uuidSchema } from "./common";
import { evidenceKindSchema } from "./learning-progress";
import { validationOutcomeSchema } from "./learning-validation";

export const learningEventNameSchema = z.enum([
  "attempt.started",
  "submission.submitted",
  "validation.result_recorded",
  "evidence.recorded",
  "guidance.hint_revealed",
  "guidance.solution_revealed"
]);

const learningEventBaseShape = {
  id: uuidSchema,
  organizationId: uuidSchema,
  enrollmentId: uuidSchema,
  attemptId: uuidSchema,
  activityVersionId: uuidSchema,
  attemptNumber: z.number().int().positive(),
  eventVersion: z.literal(1),
  occurredAt: z.string().datetime()
} as const;

const attemptStartedLearningEventSchema = z
  .object({ ...learningEventBaseShape, eventName: z.literal("attempt.started") })
  .strict();

const submissionSubmittedLearningEventSchema = z
  .object({
    ...learningEventBaseShape,
    eventName: z.literal("submission.submitted"),
    submissionId: uuidSchema
  })
  .strict();

const validationResultRecordedLearningEventSchema = z
  .object({
    ...learningEventBaseShape,
    eventName: z.literal("validation.result_recorded"),
    submissionId: uuidSchema,
    validationResultId: uuidSchema,
    outcome: validationOutcomeSchema,
    score: z.number().min(0).max(1).nullable()
  })
  .strict();

const learningEvidenceSourceSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("manual") }).strict(),
  z
    .object({
      type: z.literal("validation_result"),
      validationResultId: uuidSchema
    })
    .strict()
]);

const evidenceRecordedLearningEventSchema = z
  .object({
    ...learningEventBaseShape,
    eventName: z.literal("evidence.recorded"),
    submissionId: uuidSchema,
    evidenceId: uuidSchema,
    skillId: uuidSchema,
    kind: evidenceKindSchema,
    score: z.number().min(0).max(1).nullable(),
    source: learningEvidenceSourceSchema
  })
  .strict();

const guidanceHintRevealedLearningEventSchema = z
  .object({
    ...learningEventBaseShape,
    eventName: z.literal("guidance.hint_revealed"),
    guidanceExposureId: uuidSchema,
    stepKey: resourceSlugSchema,
    hintKey: resourceSlugSchema
  })
  .strict();

const guidanceSolutionRevealedLearningEventSchema = z
  .object({
    ...learningEventBaseShape,
    eventName: z.literal("guidance.solution_revealed"),
    guidanceExposureId: uuidSchema,
    solutionKey: resourceSlugSchema
  })
  .strict();

export const learningEventSchema = z.discriminatedUnion("eventName", [
  attemptStartedLearningEventSchema,
  submissionSubmittedLearningEventSchema,
  validationResultRecordedLearningEventSchema,
  evidenceRecordedLearningEventSchema,
  guidanceHintRevealedLearningEventSchema,
  guidanceSolutionRevealedLearningEventSchema
]);

export const learningEventHistoryQuerySchema = z
  .object({
    limit: z.coerce.number().int().min(1).max(100).default(50),
    cursor: z.string().min(1).max(1000).optional()
  })
  .strict();

export const learningEventHistoryPageSchema = z
  .object({
    organizationId: uuidSchema,
    enrollmentId: uuidSchema,
    offeringId: uuidSchema,
    events: z.array(learningEventSchema),
    nextCursor: z.string().nullable()
  })
  .strict();

export type LearningEventName = z.infer<typeof learningEventNameSchema>;
export type LearningEvent = z.infer<typeof learningEventSchema>;
export type LearningEventHistoryQuery = z.infer<typeof learningEventHistoryQuerySchema>;
export type LearningEventHistoryPage = z.infer<typeof learningEventHistoryPageSchema>;
