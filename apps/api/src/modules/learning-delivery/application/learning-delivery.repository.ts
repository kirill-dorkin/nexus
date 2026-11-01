import type {
  Attendance,
  CourseRun,
  DeliveryGroup,
  Enrollment,
  GroupMembership,
  GroupSet,
  LearningOffering,
  Session
} from "@platform/contracts";
import type { DatabaseTransaction } from "@platform/database";

export type NewLearningOffering = Readonly<{
  id: string;
  organizationId: string;
  courseVersionId: string;
  slug: string;
  name: string;
  deliveryMode: LearningOffering["deliveryMode"];
  accessMode: LearningOffering["accessMode"];
  startsAt: string | null;
  endsAt: string | null;
  createdByUserId: string;
}>;

export type NewEnrollment = Readonly<{
  id: string;
  organizationId: string;
  offeringId: string;
  userId: string;
  createdByUserId: string;
}>;

export type NewCourseRun = Readonly<{
  id: string;
  organizationId: string;
  offeringId: string;
  slug: string;
  name: string;
  startsAt: string;
  endsAt: string;
  createdByUserId: string;
}>;

export type NewGroupSet = Readonly<{
  id: string;
  organizationId: string;
  courseRunId: string;
  slug: string;
  name: string;
  createdByUserId: string;
}>;

export type NewDeliveryGroup = Readonly<{
  id: string;
  organizationId: string;
  groupSetId: string;
  slug: string;
  name: string;
  createdByUserId: string;
}>;

export type NewGroupMembership = Readonly<{
  id: string;
  organizationId: string;
  groupSetId: string;
  groupId: string;
  enrollmentId: string;
  assignedByUserId: string;
}>;

export type NewSession = Readonly<{
  id: string;
  organizationId: string;
  courseRunId: string;
  groupId: string | null;
  slug: string;
  name: string;
  startsAt: string;
  endsAt: string;
  createdByUserId: string;
}>;

export type NewAttendance = Readonly<{
  id: string;
  organizationId: string;
  sessionId: string;
  enrollmentId: string;
  status: Attendance["status"];
  recordedByUserId: string;
}>;

export abstract class LearningDeliveryRepository {
  abstract createOffering(
    transaction: DatabaseTransaction,
    offering: NewLearningOffering
  ): Promise<LearningOffering>;

  abstract findOffering(
    transaction: DatabaseTransaction,
    organizationId: string,
    offeringId: string
  ): Promise<LearningOffering | null>;

  abstract listOfferingsForCourseVersion(
    transaction: DatabaseTransaction,
    organizationId: string,
    courseVersionId: string,
    after: string | null
  ): Promise<readonly LearningOffering[]>;

  /** Null when the Offering already uses this version. Database guards enforce the forward-only rule. */
  abstract retargetOffering(
    transaction: DatabaseTransaction,
    organizationId: string,
    offeringId: string,
    courseVersionId: string
  ): Promise<LearningOffering | null>;

  abstract setOfferingVisibility(
    transaction: DatabaseTransaction,
    organizationId: string,
    offeringId: string,
    visibility: LearningOffering["visibility"]
  ): Promise<LearningOffering | null>;

  abstract createEnrollment(
    transaction: DatabaseTransaction,
    enrollment: NewEnrollment
  ): Promise<Enrollment>;

  abstract findEnrollment(
    transaction: DatabaseTransaction,
    organizationId: string,
    enrollmentId: string
  ): Promise<Enrollment | null>;

  abstract completeEnrollment(
    transaction: DatabaseTransaction,
    organizationId: string,
    enrollmentId: string,
    completedAt: string
  ): Promise<Enrollment | null>;

  abstract listActiveEnrollmentsForOffering(
    transaction: DatabaseTransaction,
    organizationId: string,
    offeringId: string
  ): Promise<readonly Enrollment[]>;

  abstract listEnrollmentsForUsers(
    transaction: DatabaseTransaction,
    organizationId: string,
    userIds: readonly string[]
  ): Promise<readonly Enrollment[]>;

  abstract createCourseRun(
    transaction: DatabaseTransaction,
    courseRun: NewCourseRun
  ): Promise<CourseRun>;

  abstract findCourseRun(
    transaction: DatabaseTransaction,
    organizationId: string,
    courseRunId: string
  ): Promise<CourseRun | null>;

  abstract createGroupSet(
    transaction: DatabaseTransaction,
    groupSet: NewGroupSet
  ): Promise<GroupSet>;

  abstract findGroupSet(
    transaction: DatabaseTransaction,
    organizationId: string,
    groupSetId: string
  ): Promise<GroupSet | null>;

  abstract createGroup(
    transaction: DatabaseTransaction,
    group: NewDeliveryGroup
  ): Promise<DeliveryGroup>;

  abstract findGroup(
    transaction: DatabaseTransaction,
    organizationId: string,
    groupId: string
  ): Promise<DeliveryGroup | null>;

  abstract createGroupMembership(
    transaction: DatabaseTransaction,
    membership: NewGroupMembership
  ): Promise<GroupMembership>;

  abstract hasGroupMembershipAt(
    transaction: DatabaseTransaction,
    organizationId: string,
    groupId: string,
    enrollmentId: string,
    at: string
  ): Promise<boolean>;

  abstract createSession(
    transaction: DatabaseTransaction,
    session: NewSession
  ): Promise<Session>;

  abstract findSession(
    transaction: DatabaseTransaction,
    organizationId: string,
    sessionId: string
  ): Promise<Session | null>;

  abstract createAttendance(
    transaction: DatabaseTransaction,
    attendance: NewAttendance
  ): Promise<Attendance>;

  abstract findAttendance(
    transaction: DatabaseTransaction,
    organizationId: string,
    attendanceId: string
  ): Promise<Attendance | null>;

  abstract updateAttendanceStatus(
    transaction: DatabaseTransaction,
    organizationId: string,
    attendanceId: string,
    status: Attendance["status"],
    updatedByUserId: string
  ): Promise<Attendance>;
}
