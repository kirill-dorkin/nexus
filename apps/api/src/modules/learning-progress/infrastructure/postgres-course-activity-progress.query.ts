import { Injectable } from "@nestjs/common";
import type { DatabaseTransaction } from "@platform/database";
import { CourseActivityProgressQuery } from "../application/course-activity-progress.query";
@Injectable()
export class PostgresCourseActivityProgressQuery extends CourseActivityProgressQuery {
  async observations(
    tx: DatabaseTransaction,
    organizationId: string,
    enrollmentId: string,
    activityVersionIds: readonly string[]
  ) {
    if (!activityVersionIds.length) return [];
    const rows = await tx.client.query<{
      activity_version_id: string;
      passed: boolean;
      last_action_at: Date;
    }>(
      `SELECT a.activity_version_id, bool_or(EXISTS (SELECT 1 FROM learning_progress.evidence e
         WHERE e.organization_id=a.organization_id AND e.attempt_id=a.id AND e.source_type='validation_result'
           AND e.source_validation_result_id IS NOT NULL AND e.payload->>'outcome'='passed')) AS passed,
         max(a.created_at) AS last_action_at FROM learning_progress.attempts a
       WHERE a.organization_id=$1 AND a.enrollment_id=$2 AND a.activity_version_id=ANY($3::uuid[]) GROUP BY a.activity_version_id`,
      [organizationId, enrollmentId, [...activityVersionIds]]
    );
    return rows.rows.map((r) => ({
      activityVersionId: r.activity_version_id,
      passed: r.passed,
      lastActionAt: r.last_action_at.toISOString()
    }));
  }
}
