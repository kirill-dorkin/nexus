import { z } from "zod";

import { uuidSchema } from "./common";

export const masteryAlgorithmKeySchema = z
  .string()
  .min(2)
  .max(80)
  .regex(/^[a-z][a-z0-9]*(?:[._-][a-z0-9]+)*$/);

export const masteryProjectionSchema = z.object({
  organizationId: uuidSchema,
  userId: uuidSchema,
  skillId: uuidSchema,
  algorithmKey: masteryAlgorithmKeySchema,
  algorithmVersion: z.number().int().positive(),
  masteryScore: z.number().min(0).max(1).nullable(),
  evidenceCount: z.number().int().positive(),
  scoredEvidenceCount: z.number().int().nonnegative(),
  lastEvidenceAt: z.iso.datetime(),
  computedAt: z.iso.datetime()
});

export const masteryRecomputeResultSchema = z.object({
  userId: uuidSchema,
  projections: z.array(masteryProjectionSchema)
});

const learnerSkillPresentationShape = {
  skillId: uuidSchema,
  title: z.string().trim().min(1).max(200),
  description: z.string().max(5000).nullable(),
  position: z.number().int().min(0)
} as const;

export const learnerSkillProgressSchema = z
  .discriminatedUnion("state", [
    z.object({
      ...learnerSkillPresentationShape,
      state: z.literal("unobserved"),
      masteryScore: z.null(),
      evidenceCount: z.literal(0),
      scoredEvidenceCount: z.literal(0),
      lastEvidenceAt: z.null()
    }),
    z.object({
      ...learnerSkillPresentationShape,
      state: z.literal("observed_unscored"),
      masteryScore: z.null(),
      evidenceCount: z.number().int().positive(),
      scoredEvidenceCount: z.literal(0),
      lastEvidenceAt: z.iso.datetime()
    }),
    z.object({
      ...learnerSkillPresentationShape,
      state: z.literal("assessed"),
      masteryScore: z.number().min(0).max(1),
      evidenceCount: z.number().int().positive(),
      scoredEvidenceCount: z.number().int().positive(),
      lastEvidenceAt: z.iso.datetime()
    })
  ])
  .superRefine((value, context) => {
    if (
      value.state === "assessed" &&
      value.scoredEvidenceCount > value.evidenceCount
    ) {
      context.addIssue({
        code: "custom",
        message: "scoredEvidenceCount cannot exceed evidenceCount",
        path: ["scoredEvidenceCount"]
      });
    }
  });

export const learnerSkillProgressReadModelSchema = z.object({
  organizationId: uuidSchema,
  enrollmentId: uuidSchema,
  offeringId: uuidSchema,
  courseVersionId: uuidSchema,
  skills: z.array(learnerSkillProgressSchema)
});

export type MasteryProjection = z.infer<typeof masteryProjectionSchema>;
export type MasteryRecomputeResult = z.infer<typeof masteryRecomputeResultSchema>;
export type LearnerSkillProgress = z.infer<typeof learnerSkillProgressSchema>;
export type LearnerSkillProgressReadModel = z.infer<
  typeof learnerSkillProgressReadModelSchema
>;
