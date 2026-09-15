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
  recordedAt: z.string().datetime()
});

const validationResultCommandBase = {
  idempotencyKey: z.string().trim().min(1).max(200),
  payload: z.record(z.string(), z.unknown()).default({})
};

export const recordValidationResultRequestSchema = z.discriminatedUnion("status", [
  z.object({
    ...validationResultCommandBase,
    status: z.literal("completed"),
    outcome: validationOutcomeSchema,
    score: z.number().min(0).max(1).nullable().optional().default(null)
  }),
  z.object({
    ...validationResultCommandBase,
    status: z.literal("system_error")
  })
]);

export type ValidatorBinding = z.infer<typeof validatorBindingSchema>;
export type ValidationResultStatus = z.infer<typeof validationResultStatusSchema>;
export type ValidationOutcome = z.infer<typeof validationOutcomeSchema>;
export type ValidationEvidenceTrust = z.infer<typeof validationEvidenceTrustSchema>;
export type ValidationResult = z.infer<typeof validationResultSchema>;
export type RecordValidationResultRequest = z.infer<
  typeof recordValidationResultRequestSchema
>;
