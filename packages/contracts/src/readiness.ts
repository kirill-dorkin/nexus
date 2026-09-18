import { z } from "zod";

import { uuidSchema } from "./common";
import { masteryAlgorithmKeySchema } from "./mastery";

export const readinessPolicyKeySchema = z
  .string()
  .min(2)
  .max(80)
  .regex(/^[a-z][a-z0-9]*(?:[._-][a-z0-9]+)*$/);

export const readinessPolicySchema = z.object({
  key: readinessPolicyKeySchema,
  version: z.number().int().positive(),
  masteryAlgorithm: z.object({
    key: masteryAlgorithmKeySchema,
    version: z.number().int().positive()
  }),
  masteryTarget: z.number().min(0).max(1),
  minimumScoredAttemptsPerSkill: z.number().int().positive(),
  evidenceFreshnessDays: z.number().int().positive()
});

export const readinessStatusSchema = z.enum([
  "insufficient_evidence",
  "not_ready",
  "ready"
]);

export const insufficientScoredAttemptsReasonSchema = z.object({
  code: z.literal("insufficient_scored_attempts"),
  observedScoredAttemptCount: z.number().int().nonnegative(),
  requiredScoredAttemptCount: z.number().int().positive()
});

export const masteryBelowTargetReasonSchema = z.object({
  code: z.literal("mastery_below_target"),
  masteryScore: z.number().min(0).max(1),
  targetMasteryScore: z.number().min(0).max(1)
});

export const scoredEvidenceStaleReasonSchema = z.object({
  code: z.literal("scored_evidence_stale"),
  lastScoredEvidenceAt: z.string().datetime(),
  freshUntil: z.string().datetime()
});

export const activeRepeatedTrustedFailureReasonSchema = z.object({
  code: z.literal("active_repeated_trusted_failure"),
  consecutiveFailureCount: z.number().int().min(2),
  firstObservedAt: z.string().datetime(),
  lastObservedAt: z.string().datetime()
});

export const readinessNotReadyReasonSchema = z.discriminatedUnion("code", [
  masteryBelowTargetReasonSchema,
  scoredEvidenceStaleReasonSchema,
  activeRepeatedTrustedFailureReasonSchema
]);

export const readinessSkillReasonSchema = z.discriminatedUnion("code", [
  insufficientScoredAttemptsReasonSchema,
  masteryBelowTargetReasonSchema,
  scoredEvidenceStaleReasonSchema,
  activeRepeatedTrustedFailureReasonSchema
]);

const readinessSkillPresentationShape = {
  skillId: uuidSchema,
  title: z.string().trim().min(1).max(200),
  position: z.number().int().nonnegative()
} as const;

export const readinessSkillDecisionSchema = z.discriminatedUnion("status", [
  z.object({
    ...readinessSkillPresentationShape,
    status: z.literal("insufficient_evidence"),
    masteryScore: z.number().min(0).max(1).nullable(),
    scoredAttemptCount: z.number().int().nonnegative(),
    lastScoredEvidenceAt: z.string().datetime().nullable(),
    freshUntil: z.string().datetime().nullable(),
    reasons: z.array(insufficientScoredAttemptsReasonSchema).min(1)
  }),
  z.object({
    ...readinessSkillPresentationShape,
    status: z.literal("not_ready"),
    masteryScore: z.number().min(0).max(1),
    scoredAttemptCount: z.number().int().positive(),
    lastScoredEvidenceAt: z.string().datetime(),
    freshUntil: z.string().datetime(),
    reasons: z.array(readinessNotReadyReasonSchema).min(1)
  }),
  z.object({
    ...readinessSkillPresentationShape,
    status: z.literal("ready"),
    masteryScore: z.number().min(0).max(1),
    scoredAttemptCount: z.number().int().positive(),
    lastScoredEvidenceAt: z.string().datetime(),
    freshUntil: z.string().datetime(),
    reasons: z.tuple([])
  })
]);

export const courseReadinessDecisionSchema = z
  .object({
    organizationId: uuidSchema,
    enrollmentId: uuidSchema,
    offeringId: uuidSchema,
    courseVersionId: uuidSchema,
    evaluatedAt: z.string().datetime(),
    policy: readinessPolicySchema,
    status: readinessStatusSchema,
    readyUntil: z.string().datetime().nullable(),
    skills: z.array(readinessSkillDecisionSchema).min(1)
  })
  .superRefine((value, context) => {
    const hasNotReady = value.skills.some((skill) => skill.status === "not_ready");
    const hasInsufficient = value.skills.some(
      (skill) => skill.status === "insufficient_evidence"
    );

    if (value.status === "ready") {
      if (hasNotReady || hasInsufficient || value.readyUntil === null) {
        context.addIssue({
          code: "custom",
          message: "ready course readiness requires every skill ready and readyUntil"
        });
      }
      return;
    }

    if (value.readyUntil !== null) {
      context.addIssue({
        code: "custom",
        path: ["readyUntil"],
        message: "non-ready course readiness cannot expose readyUntil"
      });
    }

    if (value.status === "not_ready" && !hasNotReady) {
      context.addIssue({
        code: "custom",
        message: "not_ready course readiness requires a not_ready skill"
      });
    }

    if (
      value.status === "insufficient_evidence" &&
      (hasNotReady || !hasInsufficient)
    ) {
      context.addIssue({
        code: "custom",
        message:
          "insufficient_evidence requires at least one insufficient skill and no definitive not_ready skill"
      });
    }
  });

export type ReadinessPolicy = z.infer<typeof readinessPolicySchema>;
export type ReadinessStatus = z.infer<typeof readinessStatusSchema>;
export type ReadinessSkillReason = z.infer<typeof readinessSkillReasonSchema>;
export type ReadinessSkillDecision = z.infer<typeof readinessSkillDecisionSchema>;
export type CourseReadinessDecision = z.infer<typeof courseReadinessDecisionSchema>;
