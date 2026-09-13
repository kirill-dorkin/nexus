import { z } from "zod";

import { resourceSlugSchema, uuidSchema } from "./common";

export const courseStatusSchema = z.enum(["active", "archived"]);
export const courseVersionStatusSchema = z.enum(["draft", "published"]);

export const courseSchema = z.object({
  id: uuidSchema,
  organizationId: uuidSchema,
  slug: resourceSlugSchema,
  status: courseStatusSchema
});

export const courseVersionSchema = z.object({
  id: uuidSchema,
  organizationId: uuidSchema,
  courseId: uuidSchema,
  versionNumber: z.number().int().positive(),
  status: courseVersionStatusSchema,
  title: z.string().trim().min(1).max(200),
  description: z.string().max(5000).nullable(),
  publishedAt: z.string().datetime().nullable()
});

export const createCourseRequestSchema = z.object({
  slug: resourceSlugSchema,
  title: z.string().trim().min(1).max(200),
  description: z.string().max(5000).optional()
});

export const createCourseVersionRequestSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().max(5000).optional()
});

export const createCourseResultSchema = z.object({
  course: courseSchema,
  draftVersion: courseVersionSchema
});

export type Course = z.infer<typeof courseSchema>;
export type CourseVersion = z.infer<typeof courseVersionSchema>;
export type CreateCourseRequest = z.infer<typeof createCourseRequestSchema>;
export type CreateCourseVersionRequest = z.infer<
  typeof createCourseVersionRequestSchema
>;
export type CreateCourseResult = z.infer<typeof createCourseResultSchema>;
