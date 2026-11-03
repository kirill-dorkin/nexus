import { z } from "zod";

import { uuidSchema } from "./common";

export const validatorKeySchema = z
  .string()
  .min(2)
  .max(80)
  .regex(/^[a-z][a-z0-9]*(?:[._-][a-z0-9]+)*$/);

export const validatorBindingSchema = z.object({
  validatorKey: validatorKeySchema,
  validatorVersion: z.number().int().positive(),
  config: z.record(z.string(), z.unknown()).default({})
});

export const activityValidationConfigSchema = z.object({
  validation: validatorBindingSchema
});

export const validationResultStatusSchema = z.enum(["completed", "system_error"]);
export const validationOutcomeSchema = z.enum(["passed", "failed", "needs_review"]);
export const validationEvidenceTrustSchema = z.enum(["trusted", "advisory"]);

export const validationResultSchema = z.object({
  id: uuidSchema,
  organizationId: uuidSchema,
  submissionId: uuidSchema,
  activityVersionId: uuidSchema,
  validatorKey: validatorKeySchema,
  validatorVersion: z.number().int().positive(),
  validatorConfig: z.record(z.string(), z.unknown()),
  idempotencyKey: z.string().trim().min(1).max(200),
  status: validationResultStatusSchema,
  outcome: validationOutcomeSchema.nullable(),
  score: z.number().min(0).max(1).nullable(),
  evidenceTrust: validationEvidenceTrustSchema,
  payload: z.record(z.string(), z.unknown()),
  recordedByUserId: uuidSchema.nullable(),
  recordedAt: z.iso.datetime()
});

const validationResultCommandBase = {
  idempotencyKey: z.string().trim().min(1).max(200),
  payload: z.record(z.string(), z.unknown()).default({})
};

export const recordValidationResultRequestSchema = z.discriminatedUnion("status", [
  z
    .object({
      ...validationResultCommandBase,
      status: z.literal("completed"),
      outcome: validationOutcomeSchema,
      score: z.number().min(0).max(1).nullable().optional().default(null)
    })
    .strict(),
  z
    .object({
      ...validationResultCommandBase,
      status: z.literal("system_error")
    })
    .strict()
]);

export const graderJobStatusSchema = z.enum([
  "pending",
  "processing",
  "retryable",
  "completed",
  "system_error",
  "dead_letter"
]);

export const graderJobSchema = z.object({
  jobId: z.string().regex(/^sha256:[0-9a-f]{64}$/),
  organizationId: uuidSchema,
  submissionId: uuidSchema,
  activityVersionId: uuidSchema,
  validatorKey: validatorKeySchema,
  validatorVersion: z.number().int().positive(),
  profile: z.object({
    key: validatorKeySchema,
    version: z.number().int().positive(),
    fingerprint: z.string().regex(/^sha256:[0-9a-f]{64}$/)
  }),
  status: graderJobStatusSchema,
  attemptCount: z.number().int().nonnegative(),
  availableAt: z.iso.datetime(),
  lastErrorCode: z.string().nullable(),
  finishedAt: z.iso.datetime().nullable(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime()
});

export const scheduleGraderJobRequestSchema = z.object({}).strict();

export type ValidatorBinding = z.infer<typeof validatorBindingSchema>;
export type ValidationResultStatus = z.infer<typeof validationResultStatusSchema>;
export type ValidationOutcome = z.infer<typeof validationOutcomeSchema>;
export type ValidationEvidenceTrust = z.infer<typeof validationEvidenceTrustSchema>;
export type ValidationResult = z.infer<typeof validationResultSchema>;
export type RecordValidationResultRequest = z.infer<
  typeof recordValidationResultRequestSchema
>;
export type GraderJobStatus = z.infer<typeof graderJobStatusSchema>;
export type GraderJob = z.infer<typeof graderJobSchema>;
export type ScheduleGraderJobRequest = z.infer<typeof scheduleGraderJobRequestSchema>;
