import { Injectable } from "@nestjs/common";
import type { Assignment } from "@platform/contracts";
import type { DatabaseTransaction } from "@platform/database";

import {
  AssignmentRepository,
  type NewAssignment
} from "../application/assignment.repository";

type AssignmentRow = {
  id: string;
  organization_id: string;
  offering_id: string;
  activity_version_id: string;
  slug: string;
  name: string;
  audience_type: Assignment["audience"]["type"];
  course_run_id: string | null;
  group_id: string | null;
  enrollment_id: string | null;
  available_at: Date | null;
  due_at: Date | null;
  cancelled_at: Date | null;
};

function mapAudience(row: AssignmentRow): Assignment["audience"] {
  switch (row.audience_type) {
    case "offering":
      return { type: "offering" };
    case "course_run":
      if (row.course_run_id === null) {
        throw new Error("Course-run assignment is missing its CourseRun target.");
      }
      return { type: "course_run", courseRunId: row.course_run_id };
    case "group":
      if (row.group_id === null) {
        throw new Error("Group assignment is missing its Group target.");
      }
      return { type: "group", groupId: row.group_id };
    case "enrollment":
      if (row.enrollment_id === null) {
        throw new Error("Enrollment assignment is missing its Enrollment target.");
      }
      return { type: "enrollment", enrollmentId: row.enrollment_id };
  }
}

function mapAssignment(row: AssignmentRow): Assignment {
  return {
    id: row.id,
    organizationId: row.organization_id,
    offeringId: row.offering_id,
    activityVersionId: row.activity_version_id,
    slug: row.slug,
    name: row.name,
    audience: mapAudience(row),
    availableAt: row.available_at?.toISOString() ?? null,
    dueAt: row.due_at?.toISOString() ?? null,
    cancelledAt: row.cancelled_at?.toISOString() ?? null
  };
}

const assignmentSelect = `id::text,
  organization_id::text,
  offering_id::text,
  activity_version_id::text,
  slug,
  name,
  audience_type,
  course_run_id::text,
  group_id::text,
  enrollment_id::text,
  available_at,
  due_at,
  cancelled_at`;

@Injectable()
export class PostgresAssignmentRepository extends AssignmentRepository {
  async createAssignment(
    transaction: DatabaseTransaction,
    assignment: NewAssignment
  ): Promise<Assignment> {
    const result = await transaction.client.query<AssignmentRow>(
      `INSERT INTO learning_delivery.assignments
         (id, organization_id, offering_id, activity_version_id, slug, name,
          audience_type, course_run_id, group_id, enrollment_id,
          available_at, due_at, created_by_user_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
               $11::timestamptz, $12::timestamptz, $13)
       RETURNING ${assignmentSelect}`,
      [
        assignment.id,
        assignment.organizationId,
        assignment.offeringId,
        assignment.activityVersionId,
        assignment.slug,
        assignment.name,
        assignment.audienceType,
        assignment.courseRunId,
        assignment.groupId,
        assignment.enrollmentId,
        assignment.availableAt,
        assignment.dueAt,
        assignment.createdByUserId
      ]
    );
    const row = result.rows[0];
    if (row === undefined) {
      throw new Error("PostgreSQL did not return the created assignment.");
    }
    return mapAssignment(row);
  }

  async findAssignment(
    transaction: DatabaseTransaction,
    organizationId: string,
    assignmentId: string
  ): Promise<Assignment | null> {
    const result = await transaction.client.query<AssignmentRow>(
      `SELECT ${assignmentSelect}
         FROM learning_delivery.assignments
        WHERE organization_id = $1
          AND id = $2`,
      [organizationId, assignmentId]
    );
    const row = result.rows[0];
    return row === undefined ? null : mapAssignment(row);
  }

  async listApplicableAssignments(
    transaction: DatabaseTransaction,
    organizationId: string,
    offeringId: string,
    enrollmentId: string,
    at: string
  ): Promise<readonly Assignment[]> {
    const result = await transaction.client.query<AssignmentRow>(
      `SELECT ${assignmentSelect}
         FROM learning_delivery.assignments a
        WHERE a.organization_id = $1
          AND a.offering_id = $2
          AND a.cancelled_at IS NULL
          AND (
            a.audience_type = 'offering'
            OR (
              a.audience_type = 'enrollment'
              AND a.enrollment_id = $3
            )
            OR (
              a.audience_type = 'group'
              AND EXISTS (
                SELECT 1
                  FROM learning_delivery.group_memberships gm
                 WHERE gm.organization_id = a.organization_id
                   AND gm.group_id = a.group_id
                   AND gm.enrollment_id = $3
                   AND gm.assigned_at <= $4::timestamptz
                   AND (gm.ended_at IS NULL OR gm.ended_at > $4::timestamptz)
              )
            )
            OR (
              a.audience_type = 'course_run'
              AND EXISTS (
                SELECT 1
                  FROM learning_delivery.group_memberships gm
                  JOIN learning_delivery.group_sets gs
                    ON gs.organization_id = gm.organization_id
                   AND gs.id = gm.group_set_id
                 WHERE gm.organization_id = a.organization_id
                   AND gm.enrollment_id = $3
                   AND gs.course_run_id = a.course_run_id
                   AND gm.assigned_at <= $4::timestamptz
                   AND (gm.ended_at IS NULL OR gm.ended_at > $4::timestamptz)
              )
            )
          )
        ORDER BY a.available_at NULLS FIRST,
                 a.due_at NULLS LAST,
                 a.created_at,
                 a.id`,
      [organizationId, offeringId, enrollmentId, at]
    );
    return result.rows.map(mapAssignment);
  }

  async cancelAssignment(
    transaction: DatabaseTransaction,
    organizationId: string,
    assignmentId: string,
    cancelledByUserId: string
  ): Promise<Assignment | null> {
    const result = await transaction.client.query<AssignmentRow>(
      `UPDATE learning_delivery.assignments
          SET cancelled_at = now(),
              cancelled_by_user_id = $3
        WHERE organization_id = $1
          AND id = $2
          AND cancelled_at IS NULL
       RETURNING ${assignmentSelect}`,
      [organizationId, assignmentId, cancelledByUserId]
    );
    const updated = result.rows[0];
    return updated === undefined ? null : mapAssignment(updated);
  }
}
