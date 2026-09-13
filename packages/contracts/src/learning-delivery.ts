import { z } from "zod";

import { resourceSlugSchema, uuidSchema } from "./common";

export const learningOfferingDeliveryModeSchema = z.enum([
  "self_paced",
  "cohort"
]);
export const learningOfferingStatusSchema = z.enum([
  "open",
  "closed",
  "archived"
]);
export const enrollmentStatusSchema = z.enum([
  "active",
  "completed",
  "withdrawn",
  "cancelled"
]);

const optionalDateTimeSchema = z.string().datetime().nullable();

export const learningOfferingSchema = z.object({
  id: uuidSchema,
  organizationId: uuidSchema,
  courseVersionId: uuidSchema,
  slug: resourceSlugSchema,
  name: z.string().trim().min(1).max(160),
  deliveryMode: learningOfferingDeliveryModeSchema,
  status: learningOfferingStatusSchema,
  startsAt: optionalDateTimeSchema,
  endsAt: optionalDateTimeSchema
});

export const createLearningOfferingRequestSchema = z
  .object({
    courseVersionId: uuidSchema,
    slug: resourceSlugSchema,
    name: z.string().trim().min(1).max(160),
    deliveryMode: learningOfferingDeliveryModeSchema,
    startsAt: z.string().datetime().optional(),
    endsAt: z.string().datetime().optional()
  })
  .refine(
    (value) =>
      value.startsAt === undefined ||
      value.endsAt === undefined ||
      new Date(value.endsAt).getTime() > new Date(value.startsAt).getTime(),
    {
      message: "endsAt must be later than startsAt",
      path: ["endsAt"]
    }
  );

export const enrollmentSchema = z.object({
  id: uuidSchema,
  organizationId: uuidSchema,
  offeringId: uuidSchema,
  userId: uuidSchema,
  status: enrollmentStatusSchema,
  enrolledAt: z.string().datetime(),
  completedAt: optionalDateTimeSchema
});

export const createEnrollmentRequestSchema = z.object({
  userId: uuidSchema
});

export type LearningOffering = z.infer<typeof learningOfferingSchema>;
export type CreateLearningOfferingRequest = z.infer<
  typeof createLearningOfferingRequestSchema
>;
export type Enrollment = z.infer<typeof enrollmentSchema>;
export type CreateEnrollmentRequest = z.infer<
  typeof createEnrollmentRequestSchema
>;
