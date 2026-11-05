import { z } from "zod";

import { organizationSlugSchema, resourceSlugSchema, uuidSchema } from "./common";
import { FEEDBACK_ROUTES } from "./feedback-page";

/*
 * Learner feedback for the open beta (ADR-0083). The browser keeps an equal
 * `zod/mini` copy of the request in client.ts.
 */

export const feedbackKindSchema = z.enum(["problem", "unclear", "idea"]);
export const feedbackStatusSchema = z.enum([
  "new",
  "accepted",
  "duplicate",
  "rejected",
  "done"
]);
export const feedbackDeviceSchema = z.enum(["mobile", "desktop"]);
export const feedbackRouteSchema = z.enum(FEEDBACK_ROUTES);

/** A pathname only: no query, no fragment, no scheme or host. */
export const feedbackPathSchema = z
  .string()
  .max(300)
  .regex(/^\/[A-Za-z0-9._~%/-]*$/);

const detail = z.string().trim().min(1).max(2000);

export const createFeedbackReportRequestSchema = z
  .object({
    organizationSlug: organizationSlugSchema,
    kind: feedbackKindSchema,
    text: z.string().trim().min(10).max(4000),
    /** «Что ожидали» — problems only. */
    expected: detail.optional(),
    /** «Что произошло» — problems only. */
    actual: detail.optional(),
    path: feedbackPathSchema,
    device: feedbackDeviceSchema.optional()
  })
  .strict()
  .refine(
    (report) =>
      report.kind === "problem" ||
      (report.expected === undefined && report.actual === undefined),
    { message: "Only problems have expected and actual.", path: ["kind"] }
  );

export const createFeedbackReportResponseSchema = z
  .object({ id: uuidSchema })
  .strict();

export const feedbackReportSchema = z
  .object({
    id: uuidSchema,
    kind: feedbackKindSchema,
    text: z.string(),
    expected: z.string().nullable(),
    actual: z.string().nullable(),
    route: feedbackRouteSchema,
    courseSlug: resourceSlugSchema.nullable(),
    lessonSlug: resourceSlugSchema.nullable(),
    release: z.string(),
    device: feedbackDeviceSchema.nullable(),
    signedIn: z.boolean(),
    status: feedbackStatusSchema,
    ownerNote: z.string().nullable(),
    createdAt: z.iso.datetime(),
    updatedAt: z.iso.datetime()
  })
  .strict();

export const feedbackReportListSchema = z
  .object({
    reports: z.array(feedbackReportSchema).max(50),
    nextCursor: uuidSchema.nullable()
  })
  .strict();

export const feedbackReportListQuerySchema = z
  .object({
    status: feedbackStatusSchema.optional(),
    kind: feedbackKindSchema.optional(),
    lessonSlug: resourceSlugSchema.optional(),
    after: uuidSchema.optional()
  })
  .strict();

export const updateFeedbackReportRequestSchema = z
  .object({
    status: feedbackStatusSchema.optional(),
    /** null clears the note. */
    ownerNote: z.string().trim().min(1).max(2000).nullable().optional()
  })
  .strict()
  .refine(
    (command) =>
      command.status !== undefined || command.ownerNote !== undefined,
    { message: "Nothing to change." }
  );

export type FeedbackKind = z.infer<typeof feedbackKindSchema>;
export type FeedbackStatus = z.infer<typeof feedbackStatusSchema>;
export type FeedbackDevice = z.infer<typeof feedbackDeviceSchema>;
export type CreateFeedbackReportRequest = z.infer<
  typeof createFeedbackReportRequestSchema
>;
export type FeedbackReport = z.infer<typeof feedbackReportSchema>;
export type FeedbackReportList = z.infer<typeof feedbackReportListSchema>;
export type FeedbackReportListQuery = z.infer<
  typeof feedbackReportListQuerySchema
>;
export type UpdateFeedbackReportRequest = z.infer<
  typeof updateFeedbackReportRequestSchema
>;
