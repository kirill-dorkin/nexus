import { z } from "zod";

import { resourceSlugSchema, uuidSchema } from "./common";
import { activityTypeSchema } from "./learning-graph";

export const recommendationPolicyKeySchema = z
  .string()
  .min(2)
  .max(80)
  .regex(/^[a-z][a-z0-9]*(?:[._-][a-z0-9]+)*$/);

export const recommendationPolicySchema = z.object({
  key: recommendationPolicyKeySchema,
  version: z.number().int().positive(),
  masteryTarget: z.number().min(0).max(1)
});

export const reviewSchedulingPolicySchema = z.object({
  key: recommendationPolicyKeySchema,
  version: z.number().int().positive(),
  intervalDays: z.number().int().positive()
});

export const misconceptionSignalPolicySchema = z.object({
  key: recommendationPolicyKeySchema,
  version: z.number().int().positive(),
  minimumConsecutiveFailures: z.number().int().min(2)
});

export const interventionPolicySchema = z.object({
  key: recommendationPolicyKeySchema,
  version: z.number().int().positive()
});

export const misconceptionSignalSchema = z.object({
  status: z.literal("suspected"),
  code: z.literal("repeated_trusted_failure"),
  skillId: uuidSchema,
  consecutiveFailureCount: z.number().int().min(2),
  firstObservedAt: z.iso.datetime(),
  lastObservedAt: z.iso.datetime()
});

export const recommendationInterventionSchema = z.object({
  code: z.literal("repeated_trusted_failure_remediation"),
  signalCode: z.literal("repeated_trusted_failure"),
  replacedActivityVersionId: uuidSchema,
  remediationPosition: z.number().int().nonnegative()
});

export const recommendationFocusSkillSchema = z.object({
  skillId: uuidSchema,
  title: z.string().trim().min(1).max(200),
  masteryScore: z.number().min(0).max(1).nullable(),
  targetMasteryScore: z.number().min(0).max(1)
});

export const recommendedActivitySchema = z.object({
  activityVersionId: uuidSchema,
  activityId: uuidSchema,
  slug: resourceSlugSchema,
  activityType: activityTypeSchema,
  title: z.string().trim().min(1).max(200)
});

export const recommendationReasonCodeSchema = z.enum([
  "focus_skill_unobserved",
  "focus_skill_below_target",
  "focus_skill_review_due"
]);

const attemptCountSchema = z.number().int().nonnegative();

export const recommendationReasonSchema = z.discriminatedUnion("code", [
  z.object({
    code: z.literal("focus_skill_unobserved"),
    attemptCount: attemptCountSchema
  }),
  z.object({
    code: z.literal("focus_skill_below_target"),
    attemptCount: attemptCountSchema
  }),
  z.object({
    code: z.literal("focus_skill_review_due"),
    attemptCount: attemptCountSchema,
    lastEvidenceAt: z.iso.datetime(),
    reviewDueAt: z.iso.datetime()
  })
]);

const recommendationContextShape = {
  enrollmentId: uuidSchema,
  offeringId: uuidSchema,
  courseVersionId: uuidSchema,
  policy: recommendationPolicySchema,
  reviewPolicy: reviewSchedulingPolicySchema.optional(),
  misconceptionSignalPolicy: misconceptionSignalPolicySchema.optional(),
  interventionPolicy: interventionPolicySchema.optional()
};

export const recommendedNextLearningActionSchema = z
  .object({
    status: z.literal("recommended"),
    ...recommendationContextShape,
    recommendation: z.object({
      kind: z.literal("activity"),
      activity: recommendedActivitySchema,
      focusSkill: recommendationFocusSkillSchema,
      reason: recommendationReasonSchema,
      misconceptionSignal: misconceptionSignalSchema.nullable().optional(),
      intervention: recommendationInterventionSchema.optional()
    })
  })
  .superRefine((value, context) => {
    const intervention = value.recommendation.intervention;
    if (intervention === undefined) {
      return;
    }
    if (value.interventionPolicy === undefined) {
      context.addIssue({
        code: "custom",
        path: ["interventionPolicy"],
        message: "interventionPolicy is required when an intervention is present"
      });
    }
    const signal = value.recommendation.misconceptionSignal;
    if (
      signal?.code !== intervention.signalCode
    ) {
      context.addIssue({
        code: "custom",
        path: ["recommendation", "misconceptionSignal"],
        message: "intervention requires its matching active misconception signal"
      });
    }
    if (
      signal !== undefined &&
      signal !== null &&
      signal.skillId !== value.recommendation.focusSkill.skillId
    ) {
      context.addIssue({
        code: "custom",
        path: ["recommendation", "misconceptionSignal", "skillId"],
        message: "intervention signal must match the recommendation focus skill"
      });
    }
    if (
      intervention.replacedActivityVersionId ===
      value.recommendation.activity.activityVersionId
    ) {
      context.addIssue({
        code: "custom",
        path: ["recommendation", "intervention", "replacedActivityVersionId"],
        message: "intervention must replace a different ActivityVersion"
      });
    }
  });

export const masteryTargetMetRecommendationSchema = z.object({
  status: z.literal("mastery_target_met"),
  ...recommendationContextShape,
  nextReviewAt: z.iso.datetime().nullable().optional(),
  recommendation: z.null()
});

export const noPracticeActivityReasonSchema = z
  .object({
    code: z.literal("no_practice_activity_available"),
    lastEvidenceAt: z.iso.datetime().optional(),
    reviewDueAt: z.iso.datetime().optional()
  })
  .superRefine((value, context) => {
    if (
      (value.lastEvidenceAt === undefined) !==
      (value.reviewDueAt === undefined)
    ) {
      context.addIssue({
        code: "custom",
        message:
          "lastEvidenceAt and reviewDueAt must either both be present or both be absent"
      });
    }
  });

export const noPracticeActivityRecommendationSchema = z.object({
  status: z.literal("no_practice_activity_available"),
  ...recommendationContextShape,
  focusSkill: recommendationFocusSkillSchema,
  reason: noPracticeActivityReasonSchema,
  misconceptionSignal: misconceptionSignalSchema.nullable().optional(),
  recommendation: z.null()
});

export const nextLearningRecommendationSchema = z.discriminatedUnion("status", [
  recommendedNextLearningActionSchema,
  masteryTargetMetRecommendationSchema,
  noPracticeActivityRecommendationSchema
]);

export type RecommendationPolicy = z.infer<typeof recommendationPolicySchema>;
export type ReviewSchedulingPolicy = z.infer<
  typeof reviewSchedulingPolicySchema
>;
export type MisconceptionSignalPolicy = z.infer<
  typeof misconceptionSignalPolicySchema
>;
export type InterventionPolicy = z.infer<typeof interventionPolicySchema>;
export type MisconceptionSignal = z.infer<typeof misconceptionSignalSchema>;
export type RecommendationIntervention = z.infer<
  typeof recommendationInterventionSchema
>;
export type RecommendationFocusSkill = z.infer<
  typeof recommendationFocusSkillSchema
>;
export type RecommendedActivity = z.infer<typeof recommendedActivitySchema>;
export type RecommendationReasonCode = z.infer<
  typeof recommendationReasonCodeSchema
>;
export type RecommendationReason = z.infer<typeof recommendationReasonSchema>;
export type RecommendedNextLearningAction = z.infer<
  typeof recommendedNextLearningActionSchema
>;
export type MasteryTargetMetRecommendation = z.infer<
  typeof masteryTargetMetRecommendationSchema
>;
export type NoPracticeActivityRecommendation = z.infer<
  typeof noPracticeActivityRecommendationSchema
>;
export type NextLearningRecommendation = z.infer<
  typeof nextLearningRecommendationSchema
>;
