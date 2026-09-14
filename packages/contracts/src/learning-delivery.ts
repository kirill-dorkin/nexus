import { z } from "zod";

import { resourceSlugSchema, uuidSchema } from "./common";

export const learningOfferingDeliveryModeSchema = z.enum([
  "self_paced",
  "cohort"
]);
export const learningOfferingAccessModeSchema = z.enum([
  "membership",
  "entitlement_required"
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
export const attendanceStatusSchema = z.enum([
  "present",
  "absent",
  "late",
  "excused"
]);

const optionalDateTimeSchema = z.string().datetime().nullable();
const deliveryNameSchema = z.string().trim().min(1).max(160);

export const learningOfferingSchema = z.object({
  id: uuidSchema,
  organizationId: uuidSchema,
  courseVersionId: uuidSchema,
  slug: resourceSlugSchema,
  name: deliveryNameSchema,
  deliveryMode: learningOfferingDeliveryModeSchema,
  accessMode: learningOfferingAccessModeSchema,
  status: learningOfferingStatusSchema,
  startsAt: optionalDateTimeSchema,
  endsAt: optionalDateTimeSchema
});

export const createLearningOfferingRequestSchema = z
  .object({
    courseVersionId: uuidSchema,
    slug: resourceSlugSchema,
    name: deliveryNameSchema,
    deliveryMode: learningOfferingDeliveryModeSchema,
    accessMode: learningOfferingAccessModeSchema.default("membership"),
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

export const courseRunSchema = z.object({
  id: uuidSchema,
  organizationId: uuidSchema,
  offeringId: uuidSchema,
  slug: resourceSlugSchema,
  name: deliveryNameSchema,
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime()
});

export const createCourseRunRequestSchema = z
  .object({
    slug: resourceSlugSchema,
    name: deliveryNameSchema,
    startsAt: z.string().datetime(),
    endsAt: z.string().datetime()
  })
  .refine(
    (value) =>
      new Date(value.endsAt).getTime() > new Date(value.startsAt).getTime(),
    {
      message: "endsAt must be later than startsAt",
      path: ["endsAt"]
    }
  );

export const groupSetSchema = z.object({
  id: uuidSchema,
  organizationId: uuidSchema,
  courseRunId: uuidSchema,
  slug: resourceSlugSchema,
  name: deliveryNameSchema
});

export const createGroupSetRequestSchema = z.object({
  slug: resourceSlugSchema,
  name: deliveryNameSchema
});

export const deliveryGroupSchema = z.object({
  id: uuidSchema,
  organizationId: uuidSchema,
  groupSetId: uuidSchema,
  slug: resourceSlugSchema,
  name: deliveryNameSchema
});

export const createDeliveryGroupRequestSchema = z.object({
  slug: resourceSlugSchema,
  name: deliveryNameSchema
});

export const groupMembershipSchema = z.object({
  id: uuidSchema,
  organizationId: uuidSchema,
  groupSetId: uuidSchema,
  groupId: uuidSchema,
  enrollmentId: uuidSchema,
  assignedAt: z.string().datetime(),
  endedAt: optionalDateTimeSchema
});

export const createGroupMembershipRequestSchema = z.object({
  enrollmentId: uuidSchema
});

export const sessionSchema = z.object({
  id: uuidSchema,
  organizationId: uuidSchema,
  courseRunId: uuidSchema,
  groupId: uuidSchema.nullable(),
  slug: resourceSlugSchema,
  name: deliveryNameSchema,
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime()
});

export const createSessionRequestSchema = z
  .object({
    groupId: uuidSchema.nullable().default(null),
    slug: resourceSlugSchema,
    name: deliveryNameSchema,
    startsAt: z.string().datetime(),
    endsAt: z.string().datetime()
  })
  .refine(
    (value) =>
      new Date(value.endsAt).getTime() > new Date(value.startsAt).getTime(),
    {
      message: "endsAt must be later than startsAt",
      path: ["endsAt"]
    }
  );

export const attendanceSchema = z.object({
  id: uuidSchema,
  organizationId: uuidSchema,
  sessionId: uuidSchema,
  enrollmentId: uuidSchema,
  status: attendanceStatusSchema,
  recordedAt: z.string().datetime(),
  updatedAt: z.string().datetime()
});

export const recordAttendanceRequestSchema = z.object({
  enrollmentId: uuidSchema,
  status: attendanceStatusSchema
});

export const correctAttendanceRequestSchema = z.object({
  status: attendanceStatusSchema
});

export type LearningOffering = z.infer<typeof learningOfferingSchema>;
export type CreateLearningOfferingRequest = z.infer<
  typeof createLearningOfferingRequestSchema
>;
export type Enrollment = z.infer<typeof enrollmentSchema>;
export type CreateEnrollmentRequest = z.infer<
  typeof createEnrollmentRequestSchema
>;
export type CourseRun = z.infer<typeof courseRunSchema>;
export type CreateCourseRunRequest = z.infer<typeof createCourseRunRequestSchema>;
export type GroupSet = z.infer<typeof groupSetSchema>;
export type CreateGroupSetRequest = z.infer<typeof createGroupSetRequestSchema>;
export type DeliveryGroup = z.infer<typeof deliveryGroupSchema>;
export type CreateDeliveryGroupRequest = z.infer<
  typeof createDeliveryGroupRequestSchema
>;
export type GroupMembership = z.infer<typeof groupMembershipSchema>;
export type CreateGroupMembershipRequest = z.infer<
  typeof createGroupMembershipRequestSchema
>;
export type Session = z.infer<typeof sessionSchema>;
export type CreateSessionRequest = z.infer<typeof createSessionRequestSchema>;
export type Attendance = z.infer<typeof attendanceSchema>;
export type RecordAttendanceRequest = z.infer<typeof recordAttendanceRequestSchema>;
export type CorrectAttendanceRequest = z.infer<typeof correctAttendanceRequestSchema>;
