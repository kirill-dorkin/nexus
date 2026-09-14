import { z } from "zod";

import { uuidSchema } from "./common";
import { activityTypeSchema } from "./learning-graph";

const jsonObjectSchema = z.record(z.string(), z.unknown());

export const evidenceKindSchema = activityTypeSchema;

export const attemptSchema = z.object({
  id: uuidSchema,
  organizationId: uuidSchema,
  enrollmentId: uuidSchema,
  activityVersionId: uuidSchema,
  attemptNumber: z.number().int().positive(),
  submission: jsonObjectSchema,
  submittedAt: z.string().datetime()
});

export const evidenceSchema = z.object({
  id: uuidSchema,
  organizationId: uuidSchema,
  attemptId: uuidSchema,
  skillId: uuidSchema,
  kind: evidenceKindSchema,
  score: z.number().min(0).max(1).nullable(),
  payload: jsonObjectSchema,
  recordedByUserId: uuidSchema.nullable(),
  createdAt: z.string().datetime()
});

export const createAttemptRequestSchema = z.object({
  submission: jsonObjectSchema.optional()
});

export const createEvidenceRequestSchema = z.object({
  skillId: uuidSchema,
  kind: evidenceKindSchema,
  score: z.number().min(0).max(1).optional(),
  payload: jsonObjectSchema.optional()
});

export type Attempt = z.infer<typeof attemptSchema>;
export type Evidence = z.infer<typeof evidenceSchema>;
export type CreateAttemptRequest = z.infer<typeof createAttemptRequestSchema>;
export type CreateEvidenceRequest = z.infer<typeof createEvidenceRequestSchema>;
