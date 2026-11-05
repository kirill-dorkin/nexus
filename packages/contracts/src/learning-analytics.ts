import { z } from "zod";

import { resourceSlugSchema } from "./common";

/**
 * Learning analytics from lesson pages (ADR-0084). The address is public curriculum (the
 * same slugs as the page URL); the API counts only lessons of public Offerings and attributes
 * active time to the signed-in learner when there is a session. No URL, user agent or other
 * identifiers are accepted.
 */
const lessonAddress = {
  organizationSlug: resourceSlugSchema,
  offeringSlug: resourceSlugSchema,
  lessonSlug: resourceSlugSchema
};

export const learningStepNameSchema = z.enum([
  "lesson_viewed",
  "video_started",
  "practice_run",
  "signup_clicked"
]);
export type LearningStepName = z.infer<typeof learningStepNameSchema>;

export const learningAnalyticsEventSchema = z.discriminatedUnion("type", [
  z
    .object({
      type: z.literal("lesson_step"),
      step: learningStepNameSchema,
      ...lessonAddress
    })
    .strict(),
  z
    .object({
      type: z.literal("lesson_active"),
      /** Active seconds since the previous report: page visible and used recently. */
      seconds: z.number().int().min(1).max(60),
      ...lessonAddress
    })
    .strict()
]);
export type LearningAnalyticsEvent = z.infer<
  typeof learningAnalyticsEventSchema
>;

export const learningAnalyticsBatchSchema = z
  .object({ events: z.array(learningAnalyticsEventSchema).min(1).max(30) })
  .strict();
export type LearningAnalyticsBatch = z.infer<
  typeof learningAnalyticsBatchSchema
>;
