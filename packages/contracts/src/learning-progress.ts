import { z } from "zod";

import { uuidSchema } from "./common";
import { activityTypeSchema } from "./learning-graph";

const jsonObjectSchema = z.record(z.string(), z.unknown());

export const evidenceKindSchema = activityTypeSchema;
export const evidenceSourceTypeSchema = z.enum(["manual", "validation_result"]);

export const attemptSchema = z.object({
  id: uuidSchema,
  organizationId: uuidSchema,
  enrollmentId: uuidSchema,
  activityVersionId: uuidSchema,
  attemptNumber: z.number().int().positive(),
  startedAt: z.string().datetime()
});

export const submissionSchema = z.object({
  id: uuidSchema,
  organizationId: uuidSchema,
  attemptId: uuidSchema,
  payload: jsonObjectSchema,
  submittedByUserId: uuidSchema,
  submittedAt: z.string().datetime()
});

const evidenceBaseShape = {
  id: uuidSchema,
  organizationId: uuidSchema,
  attemptId: uuidSchema,
  submissionId: uuidSchema,
  skillId: uuidSchema,
  kind: evidenceKindSchema,
  score: z.number().min(0).max(1).nullable(),
  payload: jsonObjectSchema,
  createdAt: z.string().datetime()
} as const;

export const evidenceSchema = z.discriminatedUnion("sourceType", [
  z.object({
    ...evidenceBaseShape,
    recordedByUserId: uuidSchema.nullable(),
    sourceType: z.literal("manual"),
    sourceValidationResultId: z.null()
  }),
  z.object({
    ...evidenceBaseShape,
    recordedByUserId: z.null(),
    sourceType: z.literal("validation_result"),
    sourceValidationResultId: uuidSchema
  })
]);

export const startAttemptRequestSchema = z.object({}).strict();

// Transitional compatibility command. Omitting submission starts an Attempt only;
// supplying submission atomically starts the Attempt and creates its Submission.
export const createAttemptRequestSchema = z
  .object({
    submission: jsonObjectSchema.optional()
  })
  .strict();

export const createSubmissionRequestSchema = z
  .object({
    payload: jsonObjectSchema
  })
  .strict();

export const createEvidenceRequestSchema = z.object({
  skillId: uuidSchema,
  kind: evidenceKindSchema,
  score: z.number().min(0).max(1).optional(),
  payload: jsonObjectSchema.optional()
});

export type Attempt = z.infer<typeof attemptSchema>;
export type Submission = z.infer<typeof submissionSchema>;
export type Evidence = z.infer<typeof evidenceSchema>;
export type EvidenceSourceType = z.infer<typeof evidenceSourceTypeSchema>;
export type StartAttemptRequest = z.infer<typeof startAttemptRequestSchema>;
export type CreateAttemptRequest = z.infer<typeof createAttemptRequestSchema>;
export type CreateSubmissionRequest = z.infer<typeof createSubmissionRequestSchema>;
export type CreateEvidenceRequest = z.infer<typeof createEvidenceRequestSchema>;
