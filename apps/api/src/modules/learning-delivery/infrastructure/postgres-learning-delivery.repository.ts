import { Injectable } from "@nestjs/common";
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

import {
  LearningDeliveryRepository,
  type NewAttendance,
  type NewCourseRun,
  type NewDeliveryGroup,
  type NewEnrollment,
  type NewGroupMembership,
  type NewGroupSet,
  type NewLearningOffering,
  type NewSession
} from "../application/learning-delivery.repository";

type OfferingRow = {
  id: string;
  organization_id: string;
  course_version_id: string;
  slug: string;
  name: string;
  delivery_mode: LearningOffering["deliveryMode"];
  access_mode: LearningOffering["accessMode"];
  visibility: LearningOffering["visibility"];
  status: LearningOffering["status"];
  starts_at: Date | null;
  ends_at: Date | null;
};

type EnrollmentRow = {
  id: string;
  organization_id: string;
  offering_id: string;
  user_id: string;
  status: Enrollment["status"];
  enrolled_at: Date;
  completed_at: Date | null;
};

type CourseRunRow = {
  id: string;
  organization_id: string;
  offering_id: string;
  slug: string;
  name: string;
  starts_at: Date;
  ends_at: Date;
};

type GroupSetRow = {
  id: string;
  organization_id: string;
  course_run_id: string;
  slug: string;
  name: string;
};

type DeliveryGroupRow = {
  id: string;
  organization_id: string;
  group_set_id: string;
  slug: string;
  name: string;
};

type GroupMembershipRow = {
  id: string;
  organization_id: string;
  group_set_id: string;
  group_id: string;
  enrollment_id: string;
  assigned_at: Date;
  ended_at: Date | null;
};

type SessionRow = {
  id: string;
  organization_id: string;
  course_run_id: string;
  group_id: string | null;
  slug: string;
  name: string;
  starts_at: Date;
  ends_at: Date;
};

type AttendanceRow = {
  id: string;
  organization_id: string;
  session_id: string;
  enrollment_id: string;
  status: Attendance["status"];
  recorded_at: Date;
  updated_at: Date;
};

function mapOffering(row: OfferingRow): LearningOffering {
  return {
    id: row.id,
    organizationId: row.organization_id,
    courseVersionId: row.course_version_id,
    slug: row.slug,
    name: row.name,
    deliveryMode: row.delivery_mode,
    accessMode: row.access_mode,
    status: row.status,
    visibility: row.visibility,
    startsAt: row.starts_at?.toISOString() ?? null,
    endsAt: row.ends_at?.toISOString() ?? null
  };
}

function mapEnrollment(row: EnrollmentRow): Enrollment {
  return {
    id: row.id,
    organizationId: row.organization_id,
    offeringId: row.offering_id,
    userId: row.user_id,
    status: row.status,
    enrolledAt: row.enrolled_at.toISOString(),
    completedAt: row.completed_at?.toISOString() ?? null
  };
}

function mapCourseRun(row: CourseRunRow): CourseRun {
  return {
    id: row.id,
    organizationId: row.organization_id,
    offeringId: row.offering_id,
    slug: row.slug,
    name: row.name,
    startsAt: row.starts_at.toISOString(),
    endsAt: row.ends_at.toISOString()
  };
}

function mapGroupSet(row: GroupSetRow): GroupSet {
  return {
    id: row.id,
    organizationId: row.organization_id,
    courseRunId: row.course_run_id,
    slug: row.slug,
    name: row.name
  };
}

function mapGroup(row: DeliveryGroupRow): DeliveryGroup {
  return {
    id: row.id,
    organizationId: row.organization_id,
    groupSetId: row.group_set_id,
    slug: row.slug,
    name: row.name
  };
}

function mapGroupMembership(row: GroupMembershipRow): GroupMembership {
  return {
    id: row.id,
    organizationId: row.organization_id,
    groupSetId: row.group_set_id,
    groupId: row.group_id,
    enrollmentId: row.enrollment_id,
    assignedAt: row.assigned_at.toISOString(),
    endedAt: row.ended_at?.toISOString() ?? null
  };
}

function mapSession(row: SessionRow): Session {
  return {
    id: row.id,
    organizationId: row.organization_id,
    courseRunId: row.course_run_id,
    groupId: row.group_id,
    slug: row.slug,
    name: row.name,
    startsAt: row.starts_at.toISOString(),
    endsAt: row.ends_at.toISOString()
  };
}

function mapAttendance(row: AttendanceRow): Attendance {
  return {
    id: row.id,
    organizationId: row.organization_id,
    sessionId: row.session_id,
    enrollmentId: row.enrollment_id,
    status: row.status,
    recordedAt: row.recorded_at.toISOString(),
    updatedAt: row.updated_at.toISOString()
  };
}

const offeringSelect = `id::text,
  organization_id::text,
  course_version_id::text,
  slug,
  name,
  delivery_mode,
  access_mode,
  visibility,
  status,
  starts_at,
  ends_at`;

const enrollmentSelect = `id::text,
  organization_id::text,
  offering_id::text,
  user_id::text,
  status,
  enrolled_at,
  completed_at`;

const courseRunSelect = `id::text,
  organization_id::text,
  offering_id::text,
  slug,
  name,
  starts_at,
  ends_at`;

const groupSetSelect = `id::text,
  organization_id::text,
  course_run_id::text,
  slug,
  name`;

const groupSelect = `id::text,
  organization_id::text,
  group_set_id::text,
  slug,
  name`;

const groupMembershipSelect = `id::text,
  organization_id::text,
  group_set_id::text,
  group_id::text,
  enrollment_id::text,
  assigned_at,
  ended_at`;

const sessionSelect = `id::text,
  organization_id::text,
  course_run_id::text,
  group_id::text,
  slug,
  name,
  starts_at,
  ends_at`;

const attendanceSelect = `id::text,
  organization_id::text,
  session_id::text,
  enrollment_id::text,
  status,
  recorded_at,
  updated_at`;

@Injectable()
export class PostgresLearningDeliveryRepository extends LearningDeliveryRepository {
  async createOffering(
    transaction: DatabaseTransaction,
    offering: NewLearningOffering
  ): Promise<LearningOffering> {
    const result = await transaction.client.query<OfferingRow>(
      `INSERT INTO learning_delivery.learning_offerings
         (id, organization_id, course_version_id, slug, name, delivery_mode,
          access_mode, starts_at, ends_at, created_by_user_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8::timestamptz, $9::timestamptz, $10)
       RETURNING ${offeringSelect}`,
      [
        offering.id,
        offering.organizationId,
        offering.courseVersionId,
        offering.slug,
        offering.name,
        offering.deliveryMode,
        offering.accessMode,
        offering.startsAt,
        offering.endsAt,
        offering.createdByUserId
      ]
    );
    const row = result.rows[0];
    if (row === undefined) {
      throw new Error("PostgreSQL did not return the created learning offering.");
    }
    return mapOffering(row);
  }

  async findOffering(
    transaction: DatabaseTransaction,
    organizationId: string,
    offeringId: string
  ): Promise<LearningOffering | null> {
    const result = await transaction.client.query<OfferingRow>(
      `SELECT ${offeringSelect}
         FROM learning_delivery.learning_offerings
        WHERE organization_id = $1
          AND id = $2`,
      [organizationId, offeringId]
    );
    const row = result.rows[0];
    return row === undefined ? null : mapOffering(row);
  }

  async setOfferingVisibility(
    transaction: DatabaseTransaction,
    organizationId: string,
    offeringId: string,
    visibility: LearningOffering["visibility"]
  ): Promise<LearningOffering | null> {
    const result = await transaction.client.query<OfferingRow>(
      `UPDATE learning_delivery.learning_offerings SET visibility=$3, updated_at=now()
        WHERE organization_id=$1 AND id=$2 AND visibility<>$3 RETURNING ${offeringSelect}`,
      [organizationId, offeringId, visibility]
    );
    return result.rows[0] ? mapOffering(result.rows[0]) : null;
  }

  async createEnrollment(
    transaction: DatabaseTransaction,
    enrollment: NewEnrollment
  ): Promise<Enrollment> {
    const result = await transaction.client.query<EnrollmentRow>(
      `INSERT INTO learning_delivery.enrollments
         (id, organization_id, offering_id, user_id, created_by_user_id)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING ${enrollmentSelect}`,
      [
        enrollment.id,
        enrollment.organizationId,
        enrollment.offeringId,
        enrollment.userId,
        enrollment.createdByUserId
      ]
    );
    const row = result.rows[0];
    if (row === undefined) {
      throw new Error("PostgreSQL did not return the created enrollment.");
    }
    return mapEnrollment(row);
  }

  async findEnrollment(
    transaction: DatabaseTransaction,
    organizationId: string,
    enrollmentId: string
  ): Promise<Enrollment | null> {
    const result = await transaction.client.query<EnrollmentRow>(
      `SELECT ${enrollmentSelect}
         FROM learning_delivery.enrollments
        WHERE organization_id = $1
          AND id = $2`,
      [organizationId, enrollmentId]
    );
    const row = result.rows[0];
    return row === undefined ? null : mapEnrollment(row);
  }

  async completeEnrollment(
    transaction: DatabaseTransaction,
    organizationId: string,
    enrollmentId: string,
    completedAt: string
  ): Promise<Enrollment | null> {
    const result = await transaction.client.query<EnrollmentRow>(
      `UPDATE learning_delivery.enrollments
          SET status = 'completed',
              completed_at = $3::timestamptz,
              updated_at = $3::timestamptz
        WHERE organization_id = $1
          AND id = $2
          AND status = 'active'
       RETURNING ${enrollmentSelect}`,
      [organizationId, enrollmentId, completedAt]
    );
    const row = result.rows[0];
    return row === undefined ? null : mapEnrollment(row);
  }

  async listActiveEnrollmentsForOffering(
    transaction: DatabaseTransaction,
    organizationId: string,
    offeringId: string
  ): Promise<readonly Enrollment[]> {
    const result = await transaction.client.query<EnrollmentRow>(
      `SELECT ${enrollmentSelect}
         FROM learning_delivery.enrollments
        WHERE organization_id = $1
          AND offering_id = $2
          AND status = 'active'
        ORDER BY enrolled_at, id`,
      [organizationId, offeringId]
    );
    return result.rows.map(mapEnrollment);
  }

  async listEnrollmentsForUsers(
    transaction: DatabaseTransaction,
    organizationId: string,
    userIds: readonly string[]
  ): Promise<readonly Enrollment[]> {
    if (userIds.length === 0) {
      return [];
    }

    const result = await transaction.client.query<EnrollmentRow>(
      `SELECT ${enrollmentSelect}
         FROM learning_delivery.enrollments
        WHERE organization_id = $1
          AND user_id = ANY($2::uuid[])
        ORDER BY user_id, enrolled_at, id`,
      [organizationId, [...userIds]]
    );
    return result.rows.map(mapEnrollment);
  }

  async createCourseRun(
    transaction: DatabaseTransaction,
    courseRun: NewCourseRun
  ): Promise<CourseRun> {
    const result = await transaction.client.query<CourseRunRow>(
      `INSERT INTO learning_delivery.course_runs
         (id, organization_id, offering_id, slug, name, starts_at, ends_at, created_by_user_id)
       VALUES ($1, $2, $3, $4, $5, $6::timestamptz, $7::timestamptz, $8)
       RETURNING ${courseRunSelect}`,
      [
        courseRun.id,
        courseRun.organizationId,
        courseRun.offeringId,
        courseRun.slug,
        courseRun.name,
        courseRun.startsAt,
        courseRun.endsAt,
        courseRun.createdByUserId
      ]
    );
    const row = result.rows[0];
    if (row === undefined) {
      throw new Error("PostgreSQL did not return the created course run.");
    }
    return mapCourseRun(row);
  }

  async findCourseRun(
    transaction: DatabaseTransaction,
    organizationId: string,
    courseRunId: string
  ): Promise<CourseRun | null> {
    const result = await transaction.client.query<CourseRunRow>(
      `SELECT ${courseRunSelect}
         FROM learning_delivery.course_runs
        WHERE organization_id = $1
          AND id = $2`,
      [organizationId, courseRunId]
    );
    const row = result.rows[0];
    return row === undefined ? null : mapCourseRun(row);
  }

  async createGroupSet(
    transaction: DatabaseTransaction,
    groupSet: NewGroupSet
  ): Promise<GroupSet> {
    const result = await transaction.client.query<GroupSetRow>(
      `INSERT INTO learning_delivery.group_sets
         (id, organization_id, course_run_id, slug, name, created_by_user_id)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING ${groupSetSelect}`,
      [
        groupSet.id,
        groupSet.organizationId,
        groupSet.courseRunId,
        groupSet.slug,
        groupSet.name,
        groupSet.createdByUserId
      ]
    );
    const row = result.rows[0];
    if (row === undefined) {
      throw new Error("PostgreSQL did not return the created group set.");
    }
    return mapGroupSet(row);
  }

  async findGroupSet(
    transaction: DatabaseTransaction,
    organizationId: string,
    groupSetId: string
  ): Promise<GroupSet | null> {
    const result = await transaction.client.query<GroupSetRow>(
      `SELECT ${groupSetSelect}
         FROM learning_delivery.group_sets
        WHERE organization_id = $1
          AND id = $2`,
      [organizationId, groupSetId]
    );
    const row = result.rows[0];
    return row === undefined ? null : mapGroupSet(row);
  }

  async createGroup(
    transaction: DatabaseTransaction,
    group: NewDeliveryGroup
  ): Promise<DeliveryGroup> {
    const result = await transaction.client.query<DeliveryGroupRow>(
      `INSERT INTO learning_delivery.groups
         (id, organization_id, group_set_id, slug, name, created_by_user_id)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING ${groupSelect}`,
      [
        group.id,
        group.organizationId,
        group.groupSetId,
        group.slug,
        group.name,
        group.createdByUserId
      ]
    );
    const row = result.rows[0];
    if (row === undefined) {
      throw new Error("PostgreSQL did not return the created delivery group.");
    }
    return mapGroup(row);
  }

  async findGroup(
    transaction: DatabaseTransaction,
    organizationId: string,
    groupId: string
  ): Promise<DeliveryGroup | null> {
    const result = await transaction.client.query<DeliveryGroupRow>(
      `SELECT ${groupSelect}
         FROM learning_delivery.groups
        WHERE organization_id = $1
          AND id = $2`,
      [organizationId, groupId]
    );
    const row = result.rows[0];
    return row === undefined ? null : mapGroup(row);
  }

  async createGroupMembership(
    transaction: DatabaseTransaction,
    membership: NewGroupMembership
  ): Promise<GroupMembership> {
    const result = await transaction.client.query<GroupMembershipRow>(
      `INSERT INTO learning_delivery.group_memberships
         (id, organization_id, group_set_id, group_id, enrollment_id, assigned_by_user_id)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING ${groupMembershipSelect}`,
      [
        membership.id,
        membership.organizationId,
        membership.groupSetId,
        membership.groupId,
        membership.enrollmentId,
        membership.assignedByUserId
      ]
    );
    const row = result.rows[0];
    if (row === undefined) {
      throw new Error("PostgreSQL did not return the created group membership.");
    }
    return mapGroupMembership(row);
  }

  async hasGroupMembershipAt(
    transaction: DatabaseTransaction,
    organizationId: string,
    groupId: string,
    enrollmentId: string,
    at: string
  ): Promise<boolean> {
    const result = await transaction.client.query<{ exists: boolean }>(
      `SELECT EXISTS (
         SELECT 1
           FROM learning_delivery.group_memberships
          WHERE organization_id = $1
            AND group_id = $2
            AND enrollment_id = $3
            AND assigned_at <= $4::timestamptz
            AND (ended_at IS NULL OR ended_at > $4::timestamptz)
       ) AS exists`,
      [organizationId, groupId, enrollmentId, at]
    );
    return result.rows[0]?.exists === true;
  }

  async createSession(
    transaction: DatabaseTransaction,
    session: NewSession
  ): Promise<Session> {
    const result = await transaction.client.query<SessionRow>(
      `INSERT INTO learning_delivery.sessions
         (id, organization_id, course_run_id, group_id, slug, name, starts_at, ends_at, created_by_user_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7::timestamptz, $8::timestamptz, $9)
       RETURNING ${sessionSelect}`,
      [
        session.id,
        session.organizationId,
        session.courseRunId,
        session.groupId,
        session.slug,
        session.name,
        session.startsAt,
        session.endsAt,
        session.createdByUserId
      ]
    );
    const row = result.rows[0];
    if (row === undefined) {
      throw new Error("PostgreSQL did not return the created session.");
    }
    return mapSession(row);
  }

  async findSession(
    transaction: DatabaseTransaction,
    organizationId: string,
    sessionId: string
  ): Promise<Session | null> {
    const result = await transaction.client.query<SessionRow>(
      `SELECT ${sessionSelect}
         FROM learning_delivery.sessions
        WHERE organization_id = $1
          AND id = $2`,
      [organizationId, sessionId]
    );
    const row = result.rows[0];
    return row === undefined ? null : mapSession(row);
  }

  async createAttendance(
    transaction: DatabaseTransaction,
    attendance: NewAttendance
  ): Promise<Attendance> {
    const result = await transaction.client.query<AttendanceRow>(
      `INSERT INTO learning_delivery.attendances
         (id, organization_id, session_id, enrollment_id, status,
          recorded_by_user_id, updated_by_user_id)
       VALUES ($1, $2, $3, $4, $5, $6, $6)
       RETURNING ${attendanceSelect}`,
      [
        attendance.id,
        attendance.organizationId,
        attendance.sessionId,
        attendance.enrollmentId,
        attendance.status,
        attendance.recordedByUserId
      ]
    );
    const row = result.rows[0];
    if (row === undefined) {
      throw new Error("PostgreSQL did not return the created attendance.");
    }
    return mapAttendance(row);
  }

  async findAttendance(
    transaction: DatabaseTransaction,
    organizationId: string,
    attendanceId: string
  ): Promise<Attendance | null> {
    const result = await transaction.client.query<AttendanceRow>(
      `SELECT ${attendanceSelect}
         FROM learning_delivery.attendances
        WHERE organization_id = $1
          AND id = $2`,
      [organizationId, attendanceId]
    );
    const row = result.rows[0];
    return row === undefined ? null : mapAttendance(row);
  }

  async updateAttendanceStatus(
    transaction: DatabaseTransaction,
    organizationId: string,
    attendanceId: string,
    status: Attendance["status"],
    updatedByUserId: string
  ): Promise<Attendance> {
    const result = await transaction.client.query<AttendanceRow>(
      `UPDATE learning_delivery.attendances
          SET status = $3,
              updated_by_user_id = $4
        WHERE organization_id = $1
          AND id = $2
       RETURNING ${attendanceSelect}`,
      [organizationId, attendanceId, status, updatedByUserId]
    );
    const row = result.rows[0];
    if (row === undefined) {
      throw new Error("PostgreSQL did not return the corrected attendance.");
    }
    return mapAttendance(row);
  }
}
