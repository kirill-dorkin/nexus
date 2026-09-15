import { z } from "zod";

import { resourceSlugSchema, uuidSchema } from "./common";
import { guidedBuildAuthoringSchema } from "./guided-build";

export const skillStatusSchema = z.enum(["active", "retired"]);

export const activityTypeSchema = z
  .string()
  .trim()
  .min(2)
  .max(80)
  .regex(/^[a-z][a-z0-9]*(?:[._-][a-z0-9]+)*$/);

export const skillSchema = z.object({
  id: uuidSchema,
  organizationId: uuidSchema,
  key: resourceSlugSchema,
  title: z.string().trim().min(1).max(200),
  description: z.string().max(5000).nullable(),
  status: skillStatusSchema
});

export const courseVersionSkillSchema = z.object({
  organizationId: uuidSchema,
  courseVersionId: uuidSchema,
  skillId: uuidSchema,
  title: z.string().trim().min(1).max(200),
  description: z.string().max(5000).nullable(),
  position: z.number().int().min(0)
});

export const courseVersionActivitySchema = z.object({
  id: uuidSchema,
  organizationId: uuidSchema,
  courseVersionId: uuidSchema,
  activityId: uuidSchema,
  slug: resourceSlugSchema,
  activityType: activityTypeSchema,
  title: z.string().trim().min(1).max(200),
  instructions: z.string().max(20000).nullable(),
  config: z.record(z.string(), z.unknown()),
  position: z.number().int().min(0),
  skillIds: z.array(uuidSchema).min(1)
});

export const createSkillRequestSchema = z.object({
  key: resourceSlugSchema,
  title: z.string().trim().min(1).max(200),
  description: z.string().max(5000).optional()
});

export const attachSkillToCourseVersionRequestSchema = z.object({
  skillId: uuidSchema,
  position: z.number().int().min(0).optional()
});

export const createCourseVersionActivityRequestSchema = z
  .object({
    slug: resourceSlugSchema,
    activityType: activityTypeSchema,
    title: z.string().trim().min(1).max(200),
    instructions: z.string().max(20000).optional(),
    config: z.record(z.string(), z.unknown()).optional(),
    position: z.number().int().min(0).optional(),
    skillIds: z.array(uuidSchema).min(1).max(50),
    guidedBuild: guidedBuildAuthoringSchema.optional()
  })
  .strict();

export type Skill = z.infer<typeof skillSchema>;
export type CourseVersionSkill = z.infer<typeof courseVersionSkillSchema>;
export type CourseVersionActivity = z.infer<typeof courseVersionActivitySchema>;
export type CreateSkillRequest = z.infer<typeof createSkillRequestSchema>;
export type AttachSkillToCourseVersionRequest = z.infer<typeof attachSkillToCourseVersionRequestSchema>;
export type CreateCourseVersionActivityRequest = z.infer<typeof createCourseVersionActivityRequestSchema>;
