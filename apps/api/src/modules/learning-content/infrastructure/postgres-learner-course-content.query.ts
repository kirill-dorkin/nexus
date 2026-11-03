import { Injectable } from "@nestjs/common";
import type { DatabaseTransaction } from "@platform/database";
import {
  LearnerCourseContentQuery,
  type LearnerLessonStructure
} from "../application/learner-course-content.query";
@Injectable()
export class PostgresLearnerCourseContentQuery extends LearnerCourseContentQuery {
  async lessons(
    tx: DatabaseTransaction,
    organizationId: string,
    versionId: string,
    lock = false
  ) {
    const version = (
      await tx.client.query<{ id: string }>(
        `SELECT v.id FROM learning_content.course_versions v JOIN learning_content.courses c ON c.organization_id=v.organization_id AND c.id=v.course_id
       WHERE v.organization_id=$1 AND v.id=$2 AND v.status='published' AND v.manifest_schema_version=1 AND c.status='active' ${lock ? "FOR SHARE OF c" : ""}`,
        [organizationId, versionId]
      )
    ).rows[0];
    if (!version) return null;
    const result = await tx.client.query<{
      slug: string;
      activities: LearnerLessonStructure["activities"];
    }>(
      `SELECT l.slug, coalesce((SELECT jsonb_agg(jsonb_build_object('slug',a.slug,'activityId',a.activity_id,'activityVersionId',a.id,'required',b.required) ORDER BY b.position)
         FROM learning_content.course_version_lesson_blocks b JOIN learning_content.course_version_activities a
           ON a.organization_id=b.organization_id AND a.course_version_id=b.course_version_id AND a.activity_id=b.activity_id
        WHERE b.organization_id=vl.organization_id AND b.course_version_id=vl.course_version_id AND b.lesson_id=vl.lesson_id AND b.block_type='activity'), '[]'::jsonb) AS activities
       FROM learning_content.course_version_lessons vl JOIN learning_content.lessons l ON l.organization_id=vl.organization_id AND l.id=vl.lesson_id
       WHERE vl.organization_id=$1 AND vl.course_version_id=$2 ORDER BY vl.position`,
      [organizationId, versionId]
    );
    return result.rows.length ? result.rows : null;
  }
  async activityLineage(tx: DatabaseTransaction, organizationId: string, activityIds: readonly string[]) {
    if (!activityIds.length) return new Map<string, string>();
    const result = await tx.client.query<{ id: string; activity_id: string }>(
      `SELECT a.id, a.activity_id FROM learning_content.course_version_activities a
         JOIN learning_content.course_versions v ON v.organization_id=a.organization_id AND v.id=a.course_version_id
        WHERE a.organization_id=$1 AND a.activity_id=ANY($2::uuid[]) AND v.status='published'`,
      [organizationId, [...activityIds]]
    );
    return new Map(result.rows.map((r) => [r.id, r.activity_id]));
  }
}
