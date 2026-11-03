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

export const guidedBuildContentSchema = z.record(z.string(), z.unknown());

export const guidedBuildHintDefinitionSchema = z
  .object({ key: resourceSlugSchema })
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

function validateDefinitionKeys(
  definition: {
    steps: readonly { key: string; hints: readonly { key: string }[] }[];
  },
  context: z.RefinementCtx
): void {
  const stepKeys = new Set<string>();
  const hintKeys = new Set<string>();

  for (const [stepIndex, step] of definition.steps.entries()) {
    if (stepKeys.has(step.key)) {
      context.addIssue({
        code: "custom",
        message: "Guided Build step keys must be unique.",
        path: ["steps", stepIndex, "key"]
      });
    }
    stepKeys.add(step.key);

    for (const [hintIndex, hint] of step.hints.entries()) {
      if (hintKeys.has(hint.key)) {
        context.addIssue({
          code: "custom",
          message: "Guided Build hint keys must be unique across the definition.",
          path: ["steps", stepIndex, "hints", hintIndex, "key"]
        });
      }
      hintKeys.add(hint.key);
    }
  }
}

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
    validateDefinitionKeys(definition, context);
    if (definition.transferActivityVersionId === definition.activityVersionId) {
      context.addIssue({
        code: "custom",
        message: "A transfer challenge must reference a different ActivityVersion.",
        path: ["transferActivityVersionId"]
      });
    }
  });

export const guidedBuildAuthoringHintSchema = z
  .object({
    key: resourceSlugSchema,
    content: guidedBuildContentSchema
  })
  .strict();

export const guidedBuildAuthoringStepSchema = z
  .object({
    key: resourceSlugSchema,
    title: z.string().trim().min(1).max(200),
    instructions: z.string().max(20_000).nullable().optional(),
    hints: z.array(guidedBuildAuthoringHintSchema).max(20)
  })
  .strict();

export const guidedBuildAuthoringSchema = z
  .object({
    schemaVersion: z.literal(1).default(1),
    steps: z.array(guidedBuildAuthoringStepSchema).min(1).max(100),
    professionalSolution: z
      .object({
        key: resourceSlugSchema,
        title: z.string().trim().min(1).max(200),
        content: guidedBuildContentSchema
      })
      .strict(),
    transferActivityVersionId: uuidSchema.nullable().optional()
  })
  .strict()
  .superRefine((definition, context) => validateDefinitionKeys(definition, context));

export const guidedBuildProtectedDefinitionSchema = z
  .object({
    schemaVersion: z.literal(1),
    activityVersionId: uuidSchema,
    steps: z.array(
      z
        .object({
          key: resourceSlugSchema,
          title: z.string().trim().min(1).max(200),
          instructions: z.string().max(20_000).nullable(),
          hints: z.array(
            z
              .object({
                key: resourceSlugSchema,
                content: guidedBuildContentSchema
              })
              .strict()
          )
        })
        .strict()
    ),
    professionalSolution: z
      .object({
        key: resourceSlugSchema,
        title: z.string().trim().min(1).max(200),
        content: guidedBuildContentSchema
      })
      .strict(),
    transferActivityVersionId: uuidSchema.nullable()
  })
  .strict();

const guidedBuildExposureBaseShape = {
  id: uuidSchema,
  organizationId: uuidSchema,
  enrollmentId: uuidSchema,
  attemptId: uuidSchema,
  activityVersionId: uuidSchema,
  revealedAt: z.iso.datetime()
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
  .strict()
  .superRefine((step, context) => {
    if (step.revealedHintKeys.length > step.totalHintCount) {
      context.addIssue({
        code: "custom",
        message: "Revealed hint count cannot exceed the ladder size.",
        path: ["revealedHintKeys"]
      });
    }
    if (step.canRevealNextHint && step.nextHintKey === null) {
      context.addIssue({
        code: "custom",
        message: "A revealable next hint requires a nextHintKey.",
        path: ["nextHintKey"]
      });
    }
    if (step.nextHintKey !== null && step.revealedHintKeys.includes(step.nextHintKey)) {
      context.addIssue({
        code: "custom",
        message: "The next hint cannot already be revealed.",
        path: ["nextHintKey"]
      });
    }
  });

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
  .strict()
  .superRefine((state, context) => {
    const anyHintRevealable = state.steps.some((step) => step.canRevealNextHint);
    if (state.phase === "working") {
      if (state.solution.status !== "locked" || state.solution.canCompare) {
        context.addIssue({ code: "custom", message: "Working Guided Build state requires a locked solution.", path: ["solution"] });
      }
      if (state.transfer?.status === "available") {
        context.addIssue({ code: "custom", message: "Transfer cannot be available before Submission.", path: ["transfer", "status"] });
      }
      return;
    }
    if (anyHintRevealable) {
      context.addIssue({ code: "custom", message: "No new hints can be revealed after Submission.", path: ["steps"] });
    }
    if (state.transfer?.status === "locked") {
      context.addIssue({ code: "custom", message: "Configured transfer becomes available after Submission.", path: ["transfer", "status"] });
    }
    if (state.phase === "submitted") {
      if (state.solution.status !== "available" || state.solution.canCompare) {
        context.addIssue({ code: "custom", message: "Submitted Guided Build state requires an available unrevealed solution.", path: ["solution"] });
      }
      return;
    }
    if (state.solution.status !== "revealed" || !state.solution.canCompare) {
      context.addIssue({ code: "custom", message: "Reviewing Guided Build state requires a revealed comparable solution.", path: ["solution"] });
    }
  });

export const revealGuidedBuildHintRequestSchema = z
  .object({
    stepKey: resourceSlugSchema,
    idempotencyKey: z.string().trim().min(1).max(200)
  })
  .strict();

export const revealGuidedBuildSolutionRequestSchema = z
  .object({ idempotencyKey: z.string().trim().min(1).max(200) })
  .strict();

const revealedHintSchema = z
  .object({
    exposureId: uuidSchema,
    key: resourceSlugSchema,
    content: guidedBuildContentSchema,
    revealedAt: z.iso.datetime()
  })
  .strict();

export const guidedBuildRevealedSolutionSchema = z
  .object({
    exposureId: uuidSchema,
    key: resourceSlugSchema,
    title: z.string().trim().min(1).max(200),
    content: guidedBuildContentSchema,
    revealedAt: z.iso.datetime()
  })
  .strict();

export const guidedBuildLearnerViewSchema = z
  .object({
    state: guidedBuildLearnerStateSchema,
    steps: z.array(
      z
        .object({
          key: resourceSlugSchema,
          title: z.string().trim().min(1).max(200),
          instructions: z.string().max(20_000).nullable(),
          revealedHints: z.array(revealedHintSchema)
        })
        .strict()
    ),
    professionalSolution: guidedBuildRevealedSolutionSchema.nullable()
  })
  .strict();

const guidedBuildCompareSubmissionSchema = z
  .object({
    id: uuidSchema,
    organizationId: uuidSchema,
    attemptId: uuidSchema,
    payload: guidedBuildContentSchema,
    submittedByUserId: uuidSchema,
    submittedAt: z.iso.datetime()
  })
  .strict();

export const guidedBuildCompareViewSchema = z
  .object({
    sourceAttemptId: uuidSchema,
    sourceActivityVersionId: uuidSchema,
    submission: guidedBuildCompareSubmissionSchema,
    professionalSolution: guidedBuildRevealedSolutionSchema
  })
  .strict();

export const guidedBuildTransferHandoffSchema = z
  .object({
    sourceAttemptId: uuidSchema,
    enrollmentId: uuidSchema,
    activityVersionId: uuidSchema,
    activityId: uuidSchema,
    slug: resourceSlugSchema,
    title: z.string().trim().min(1).max(200)
  })
  .strict();

export type GuidedBuildPhase = z.infer<typeof guidedBuildPhaseSchema>;
export type GuidedBuildWorkAssistance = z.infer<typeof guidedBuildWorkAssistanceSchema>;
export type GuidedBuildDefinition = z.infer<typeof guidedBuildDefinitionSchema>;
export type GuidedBuildAuthoring = z.infer<typeof guidedBuildAuthoringSchema>;
export type GuidedBuildProtectedDefinition = z.infer<typeof guidedBuildProtectedDefinitionSchema>;
export type GuidedBuildExposure = z.infer<typeof guidedBuildExposureSchema>;
export type GuidedBuildStepState = z.infer<typeof guidedBuildStepStateSchema>;
export type GuidedBuildLearnerState = z.infer<typeof guidedBuildLearnerStateSchema>;
export type GuidedBuildLearnerView = z.infer<typeof guidedBuildLearnerViewSchema>;
export type GuidedBuildCompareView = z.infer<typeof guidedBuildCompareViewSchema>;
export type GuidedBuildTransferHandoff = z.infer<typeof guidedBuildTransferHandoffSchema>;
export type RevealGuidedBuildHintRequest = z.infer<typeof revealGuidedBuildHintRequestSchema>;
export type RevealGuidedBuildSolutionRequest = z.infer<typeof revealGuidedBuildSolutionRequestSchema>;
