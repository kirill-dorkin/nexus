import { z } from "zod";

import { resourceSlugSchema, uuidSchema } from "./common";

export const guidedBuildPhaseSchema = z.enum([
  "working",
  "submitted",
  "reviewing"
]);

export const guidedBuildWorkAssistanceSchema = z.enum([
  "unassisted",
  "hint_assisted"
]);

export const guidedBuildSolutionStatusSchema = z.enum([
  "locked",
  "available",
  "revealed"
]);

export const guidedBuildTransferStatusSchema = z.enum([
  "locked",
  "available"
]);

export const guidedBuildHintDefinitionSchema = z
  .object({
    key: resourceSlugSchema
  })
  .strict();

export const guidedBuildStepDefinitionSchema = z
  .object({
    key: resourceSlugSchema,
    title: z.string().trim().min(1).max(200),
    instructions: z.string().max(20_000).nullable(),
    hints: z.array(guidedBuildHintDefinitionSchema).max(20)
  })
  .strict();

export const guidedBuildProfessionalSolutionDefinitionSchema = z
  .object({
    key: resourceSlugSchema,
    title: z.string().trim().min(1).max(200)
  })
  .strict();

export const guidedBuildDefinitionSchema = z
  .object({
    schemaVersion: z.literal(1),
    activityVersionId: uuidSchema,
    steps: z.array(guidedBuildStepDefinitionSchema).min(1).max(100),
    professionalSolution: guidedBuildProfessionalSolutionDefinitionSchema,
    transferActivityVersionId: uuidSchema.nullable()
  })
  .strict()
  .superRefine((definition, context) => {
    const stepKeys = new Set<string>();
    const hintKeys = new Set<string>();

    for (const [stepIndex, step] of definition.steps.entries()) {
      if (stepKeys.has(step.key)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Guided Build step keys must be unique.",
          path: ["steps", stepIndex, "key"]
        });
      }
      stepKeys.add(step.key);

      for (const [hintIndex, hint] of step.hints.entries()) {
        if (hintKeys.has(hint.key)) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Guided Build hint keys must be unique across the definition.",
            path: ["steps", stepIndex, "hints", hintIndex, "key"]
          });
        }
        hintKeys.add(hint.key);
      }
    }

    if (definition.transferActivityVersionId === definition.activityVersionId) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "A transfer challenge must reference a different ActivityVersion.",
        path: ["transferActivityVersionId"]
      });
    }
  });

const guidedBuildExposureBaseShape = {
  id: uuidSchema,
  organizationId: uuidSchema,
  enrollmentId: uuidSchema,
  attemptId: uuidSchema,
  activityVersionId: uuidSchema,
  revealedAt: z.string().datetime()
} as const;

export const guidedBuildExposureSchema = z.discriminatedUnion("kind", [
  z
    .object({
      ...guidedBuildExposureBaseShape,
      kind: z.literal("hint"),
      stepKey: resourceSlugSchema,
      hintKey: resourceSlugSchema
    })
    .strict(),
  z
    .object({
      ...guidedBuildExposureBaseShape,
      kind: z.literal("professional_solution"),
      solutionKey: resourceSlugSchema
    })
    .strict()
]);

export const guidedBuildStepStateSchema = z
  .object({
    stepKey: resourceSlugSchema,
    revealedHintKeys: z.array(resourceSlugSchema),
    totalHintCount: z.number().int().nonnegative(),
    nextHintKey: resourceSlugSchema.nullable(),
    canRevealNextHint: z.boolean()
  })
  .strict();

export const guidedBuildSolutionStateSchema = z
  .object({
    key: resourceSlugSchema,
    status: guidedBuildSolutionStatusSchema,
    canCompare: z.boolean()
  })
  .strict();

export const guidedBuildTransferStateSchema = z
  .object({
    activityVersionId: uuidSchema,
    status: guidedBuildTransferStatusSchema
  })
  .strict();

export const guidedBuildLearnerStateSchema = z
  .object({
    organizationId: uuidSchema,
    enrollmentId: uuidSchema,
    attemptId: uuidSchema,
    activityVersionId: uuidSchema,
    phase: guidedBuildPhaseSchema,
    workAssistance: guidedBuildWorkAssistanceSchema,
    steps: z.array(guidedBuildStepStateSchema),
    solution: guidedBuildSolutionStateSchema,
    transfer: guidedBuildTransferStateSchema.nullable()
  })
  .strict();

export const revealGuidedBuildHintRequestSchema = z
  .object({
    stepKey: resourceSlugSchema
  })
  .strict();

export const revealGuidedBuildSolutionRequestSchema = z.object({}).strict();

export type GuidedBuildPhase = z.infer<typeof guidedBuildPhaseSchema>;
export type GuidedBuildWorkAssistance = z.infer<
  typeof guidedBuildWorkAssistanceSchema
>;
export type GuidedBuildDefinition = z.infer<typeof guidedBuildDefinitionSchema>;
export type GuidedBuildExposure = z.infer<typeof guidedBuildExposureSchema>;
export type GuidedBuildStepState = z.infer<typeof guidedBuildStepStateSchema>;
export type GuidedBuildLearnerState = z.infer<
  typeof guidedBuildLearnerStateSchema
>;
export type RevealGuidedBuildHintRequest = z.infer<
  typeof revealGuidedBuildHintRequestSchema
>;
export type RevealGuidedBuildSolutionRequest = z.infer<
  typeof revealGuidedBuildSolutionRequestSchema
>;
