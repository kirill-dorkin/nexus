import { z } from "zod";
import {
  organizationSlugSchema,
  resourceSlugSchema,
  uuidSchema
} from "./common";
import { courseManifestV1Schema } from "./course-manifest";
export const studioListQuerySchema = z
  .object({ after: uuidSchema.optional() })
  .strict();
export const ownOrganizationsSchema = z
  .object({
    organizations: z
      .array(
        z
          .object({
            id: uuidSchema,
            slug: organizationSlugSchema,
            name: z.string()
          })
          .strict()
      )
      .max(100),
    nextCursor: uuidSchema.nullable()
  })
  .strict();
export const studioCourseSummarySchema = z
  .object({
    courseId: uuidSchema,
    slug: resourceSlugSchema,
    title: z.string(),
    versionId: uuidSchema,
    versionNumber: z.number().int().positive(),
    status: z.enum(["draft", "published"]),
    revision: z.number().int().min(0)
  })
  .strict();
export const studioCourseListSchema = z
  .object({
    courses: z.array(studioCourseSummarySchema).max(100),
    nextCursor: uuidSchema.nullable(),
    canCreate: z.boolean()
  })
  .strict();
export const studioDraftSchema = studioCourseSummarySchema
  .extend({
    manifest: courseManifestV1Schema,
    canApply: z.boolean(),
    canPublish: z.boolean()
  })
  .strict();
export const studioPublishRequestSchema = z
  .object({
    draftVersionId: uuidSchema,
    expectedRevision: z.number().int().min(0)
  })
  .strict();
export const studioEmptyRequestSchema = z.object({}).strict();
export const studioCreateOrganizationSchema = z
  .object({
    slug: organizationSlugSchema,
    name: z.string().trim().min(1).max(160)
  })
  .strict();
export type StudioDraft = z.infer<typeof studioDraftSchema>;
export type StudioCourseList = z.infer<typeof studioCourseListSchema>;

export type StudioCourseSummary = z.infer<typeof studioCourseSummarySchema>;
