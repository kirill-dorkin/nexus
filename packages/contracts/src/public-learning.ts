import { z } from "zod";
import { organizationSlugSchema, resourceSlugSchema } from "./common";

const title = z.string().trim().min(1).max(200);
export const publicLearningOrganizationSchema = z
  .object({
    slug: organizationSlugSchema,
    name: z.string().min(1).max(160)
  })
  .strict();
export const publicLearningOfferingSchema = z
  .object({
    slug: resourceSlugSchema,
    name: z.string().min(1).max(160)
  })
  .strict();
export const publicLessonSummarySchema = z
  .object({
    slug: resourceSlugSchema,
    title,
    summary: z.string().max(5000),
    chapter: z.string().min(1).max(80).optional(),
    durationMinutes: z.number().int().min(1).max(1440)
  })
  .strict();
export const publicCourseContentSchema = z
  .object({
    /** Stable curriculum identity; survives new course versions and Offerings. */
    slug: resourceSlugSchema,
    title,
    description: z.string().max(5000),
    lessons: z.array(publicLessonSummarySchema).min(1).max(200)
  })
  .strict();
export const publicLearningCourseSchema = z
  .object({
    organization: publicLearningOrganizationSchema,
    offering: publicLearningOfferingSchema,
    course: publicCourseContentSchema
  })
  .strict();
export const publicLearningCatalogSchema = z
  .object({
    courses: z.array(publicLearningCourseSchema).max(100)
  })
  .strict();

const activityBase = {
  slug: resourceSlugSchema,
  title,
  instructions: z.string().max(20000),
  question: z.string().min(1).max(20000)
};
const choices = z
  .array(
    z
      .object({
        id: z
          .string()
          .min(1)
          .max(63)
          .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
        text: z.string().min(1).max(2000)
      })
      .strict()
  )
  .min(2)
  .max(50);
export const publicQuizActivitySchema = z.discriminatedUnion("type", [
  z
    .object({
      ...activityBase,
      type: z.literal("quiz.single_choice"),
      options: choices
    })
    .strict(),
  z
    .object({
      ...activityBase,
      type: z.literal("quiz.multiple_choice"),
      options: choices
    })
    .strict(),
  z.object({ ...activityBase, type: z.literal("quiz.short_text") }).strict()
]);
export const publicLessonBlockSchema = z.discriminatedUnion("type", [
  z
    .object({
      type: z.literal("youtube"),
      videoId: z.string().regex(/^[A-Za-z0-9_-]{11}$/)
    })
    .strict(),
  z
    .object({
      type: z.literal("markdown"),
      markdown: z.string().min(1).max(50000)
    })
    .strict(),
  z
    .object({
      type: z.literal("activity"),
      title: title.nullable(),
      kind: z.enum(["practice", "homework"]),
      required: z.boolean(),
      activity: publicQuizActivitySchema
    })
    .strict()
]);
export const publicLessonContentSchema = publicLessonSummarySchema
  .extend({
    blocks: z.array(publicLessonBlockSchema).min(1).max(200)
  })
  .strict();
export const publicLearningLessonSchema = publicLearningCourseSchema
  .extend({
    lesson: publicLessonContentSchema
  })
  .strict();
export type PublicCourseContent = z.infer<typeof publicCourseContentSchema>;
export type PublicLessonContent = z.infer<typeof publicLessonContentSchema>;
export type PublicLearningCourse = z.infer<typeof publicLearningCourseSchema>;
export type PublicLearningCatalog = z.infer<typeof publicLearningCatalogSchema>;
export type PublicLearningLesson = z.infer<typeof publicLearningLessonSchema>;
export type PublicQuizActivity = z.infer<typeof publicQuizActivitySchema>;
