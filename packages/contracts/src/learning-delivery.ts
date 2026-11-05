import { z } from "zod";

import { resourceSlugSchema, uuidSchema } from "./common";
import { courseVersionActivitySchema } from "./learning-graph";

export const learningOfferingDeliveryModeSchema = z.enum([
  "self_paced",
  "cohort"
]);
export const learningOfferingAccessModeSchema = z.enum([
  "membership",
  "entitlement_required"
]);
export const learningOfferingVisibilitySchema = z.enum(["private", "public"]);
export const updateLearningOfferingVisibilityRequestSchema = z
  .object({
    visibility: learningOfferingVisibilitySchema
  })
  .strict();
/** Moves a free self-paced Offering forward to a newer published version of the same Course (ADR-0062). */
export const retargetLearningOfferingRequestSchema = z
  .object({
    courseVersionId: uuidSchema
  })
  .strict();

/** Studio-only, course-version-scoped listing; pagination locator is never authority. */
export const listLearningOfferingsQuerySchema = z
  .object({
    courseVersionId: uuidSchema,
    after: uuidSchema.optional(),
    /** `course`: Offerings on any published version of the same Course. */
    scope: z.enum(["version", "course"]).optional()
  })
  .strict();

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
export const assignmentAudienceTypeSchema = z.enum([
  "offering",
  "course_run",
  "group",
  "enrollment"
]);
export const learnerAssignmentTimingSchema = z.enum([
  "upcoming",
  "available",
  "past_due"
]);

const optionalDateTimeSchema = z.iso.datetime().nullable();
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
  visibility: learningOfferingVisibilitySchema,
  startsAt: optionalDateTimeSchema,
  endsAt: optionalDateTimeSchema
});

export const learningOfferingListSchema = z
  .object({
    offerings: z.array(learningOfferingSchema).max(50),
    nextCursor: uuidSchema.nullable()
  })
  .strict();
export type LearningOfferingList = z.infer<typeof learningOfferingListSchema>;

export const createLearningOfferingRequestSchema = z
  .object({
    courseVersionId: uuidSchema,
    slug: resourceSlugSchema,
    name: deliveryNameSchema,
    deliveryMode: learningOfferingDeliveryModeSchema,
    accessMode: learningOfferingAccessModeSchema.default("membership"),
    startsAt: z.iso.datetime().optional(),
    endsAt: z.iso.datetime().optional()
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
  enrolledAt: z.iso.datetime(),
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
  startsAt: z.iso.datetime(),
  endsAt: z.iso.datetime()
});

export const createCourseRunRequestSchema = z
  .object({
    slug: resourceSlugSchema,
    name: deliveryNameSchema,
    startsAt: z.iso.datetime(),
    endsAt: z.iso.datetime()
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
  assignedAt: z.iso.datetime(),
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
  startsAt: z.iso.datetime(),
  endsAt: z.iso.datetime()
});

export const createSessionRequestSchema = z
  .object({
    groupId: uuidSchema.nullable().default(null),
    slug: resourceSlugSchema,
    name: deliveryNameSchema,
    startsAt: z.iso.datetime(),
    endsAt: z.iso.datetime()
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
  recordedAt: z.iso.datetime(),
  updatedAt: z.iso.datetime()
});

export const recordAttendanceRequestSchema = z.object({
  enrollmentId: uuidSchema,
  status: attendanceStatusSchema
});

export const correctAttendanceRequestSchema = z.object({
  status: attendanceStatusSchema
});

const offeringAssignmentAudienceSchema = z
  .object({
    type: z.literal("offering")
  })
  .strict();

const courseRunAssignmentAudienceSchema = z
  .object({
    type: z.literal("course_run"),
    courseRunId: uuidSchema
  })
  .strict();

const groupAssignmentAudienceSchema = z
  .object({
    type: z.literal("group"),
    groupId: uuidSchema
  })
  .strict();

const enrollmentAssignmentAudienceSchema = z
  .object({
    type: z.literal("enrollment"),
    enrollmentId: uuidSchema
  })
  .strict();

export const assignmentAudienceSchema = z.discriminatedUnion("type", [
  offeringAssignmentAudienceSchema,
  courseRunAssignmentAudienceSchema,
  groupAssignmentAudienceSchema,
  enrollmentAssignmentAudienceSchema
]);

export const assignmentSchema = z.object({
  id: uuidSchema,
  organizationId: uuidSchema,
  offeringId: uuidSchema,
  activityVersionId: uuidSchema,
  slug: resourceSlugSchema,
  name: deliveryNameSchema,
  audience: assignmentAudienceSchema,
  availableAt: optionalDateTimeSchema,
  dueAt: optionalDateTimeSchema,
  cancelledAt: optionalDateTimeSchema
});

export const learnerRunnerAssignmentSchema = z.object({
  assignment: assignmentSchema,
  activity: courseVersionActivitySchema,
  timing: learnerAssignmentTimingSchema
});

export const learnerRunnerReadModelSchema = z.object({
  enrollmentId: uuidSchema,
  offeringId: uuidSchema,
  asOf: z.iso.datetime(),
  assignments: z.array(learnerRunnerAssignmentSchema)
});

export const createAssignmentRequestSchema = z
  .object({
    activityId: uuidSchema,
    slug: resourceSlugSchema,
    name: deliveryNameSchema,
    audience: assignmentAudienceSchema,
    availableAt: z.iso.datetime().optional(),
    dueAt: z.iso.datetime().optional()
  })
  .refine(
    (value) =>
      value.availableAt === undefined ||
      value.dueAt === undefined ||
      new Date(value.dueAt).getTime() > new Date(value.availableAt).getTime(),
    {
      message: "dueAt must be later than availableAt",
      path: ["dueAt"]
    }
  );

export type LearningOffering = z.infer<typeof learningOfferingSchema>;
export type CreateLearningOfferingRequest = z.infer<
  typeof createLearningOfferingRequestSchema
>;
export type Enrollment = z.infer<typeof enrollmentSchema>;
export type CreateEnrollmentRequest = z.infer<
  typeof createEnrollmentRequestSchema
>;
export type CourseRun = z.infer<typeof courseRunSchema>;
export type CreateCourseRunRequest = z.infer<
  typeof createCourseRunRequestSchema
>;
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
export type RecordAttendanceRequest = z.infer<
  typeof recordAttendanceRequestSchema
>;
export type CorrectAttendanceRequest = z.infer<
  typeof correctAttendanceRequestSchema
>;
export type AssignmentAudience = z.infer<typeof assignmentAudienceSchema>;
export type Assignment = z.infer<typeof assignmentSchema>;
export type LearnerAssignmentTiming = z.infer<
  typeof learnerAssignmentTimingSchema
>;
export type LearnerRunnerAssignment = z.infer<
  typeof learnerRunnerAssignmentSchema
>;
export type LearnerRunnerReadModel = z.infer<
  typeof learnerRunnerReadModelSchema
>;
export type CreateAssignmentRequest = z.infer<
  typeof createAssignmentRequestSchema
>;

export type UpdateLearningOfferingVisibilityRequest = z.infer<
  typeof updateLearningOfferingVisibilityRequestSchema
>;
