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
  lastEvidenceAt: z.string().datetime(),
  computedAt: z.string().datetime()
});

export const masteryRecomputeResultSchema = z.object({
  userId: uuidSchema,
  projections: z.array(masteryProjectionSchema)
});

export type MasteryProjection = z.infer<typeof masteryProjectionSchema>;
export type MasteryRecomputeResult = z.infer<typeof masteryRecomputeResultSchema>;
