import { z } from "zod";
import { resourceSlugSchema, uuidSchema } from "./common";
import { publicLearningCourseSchema } from "./public-learning";

export const freeSelfEnrollmentRequestSchema = z.object({}).strict();
export const ownLearningListQuerySchema = z
  .object({ after: uuidSchema.optional() })
  .strict();
const counts = {
  passedRequired: z.number().int().nonnegative(),
  totalRequired: z.number().int().nonnegative()
};
export const learnerCourseProgressSchema = z
  .object({
    policyKey: z.literal("required-activity-passes"),
    policyVersion: z.literal(2),
    ...counts,
    percentage: z.number().int().min(0).max(100).nullable(),
    allRequiredPassed: z.boolean(),
    nextLessonSlug: resourceSlugSchema.nullable(),
    lastActionAt: z.iso.datetime().nullable(),
    lessons: z
      .array(
        z
          .object({
            slug: resourceSlugSchema,
            ...counts,
            requiredPassed: z.boolean(),
            activities: z
              .array(
                z
                  .object({ slug: resourceSlugSchema, passed: z.boolean() })
                  .strict()
              )
              .max(200)
          })
          .strict()
      )
      .max(200)
  })
  .strict();
export const learnerLearningCourseSchema = publicLearningCourseSchema
  .extend({
    entry: z
      .object({
        customerEntryPolicy: z.enum(["open", "closed"]),
        membershipStatus: z.enum([
          "none",
          "active",
          "invited",
          "suspended",
          "left"
        ]),
        enrollmentStatus: z
          .enum(["active", "completed", "withdrawn", "cancelled"])
          .nullable()
      })
      .strict(),
    progress: learnerCourseProgressSchema.nullable()
  })
  .strict();
export const ownLearningListSchema = z
  .object({
    courses: z.array(learnerLearningCourseSchema).max(100),
    nextCursor: uuidSchema.nullable()
  })
  .strict();
export type LearnerCourseProgress = z.infer<typeof learnerCourseProgressSchema>;
export type LearnerLearningCourse = z.infer<typeof learnerLearningCourseSchema>;
export type OwnLearningList = z.infer<typeof ownLearningListSchema>;
