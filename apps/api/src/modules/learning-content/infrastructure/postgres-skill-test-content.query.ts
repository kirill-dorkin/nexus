import { ConflictException, Injectable } from "@nestjs/common";
import { skillTestQuestionSchema } from "@platform/contracts";
import type { DatabaseTransaction } from "@platform/database";

import {
  SkillTestContentQuery,
  type PublishedSkillTest
} from "../application/skill-test-content.query";

const questionsSchema = skillTestQuestionSchema.array().min(1).max(400);

@Injectable()
export class PostgresSkillTestContentQuery extends SkillTestContentQuery {
  async publishedTests(
    tx: DatabaseTransaction,
    organizationId: string,
    courseVersionIds: readonly string[],
    skillKeys?: readonly string[]
  ): Promise<readonly PublishedSkillTest[]> {
    if (courseVersionIds.length === 0) return [];
    const result = await tx.client.query<{
      activity_version_id: string;
      course_version_id: string;
      skill_key: string;
    }>(
      `SELECT a.id::text AS activity_version_id,a.course_version_id::text AS course_version_id,a.config->'presentation'->>'skillKey' AS skill_key
         FROM learning_content.course_version_activities a
         JOIN learning_content.course_versions v ON v.organization_id=a.organization_id AND v.id=a.course_version_id
        WHERE a.organization_id=$1 AND a.course_version_id=ANY($2::uuid[]) AND a.activity_type='skill.test'
          AND v.status='published' AND v.manifest_schema_version=1
          AND ($3::text[] IS NULL OR a.config->'presentation'->>'skillKey'=ANY($3::text[]))
          AND EXISTS (SELECT 1 FROM learning_content.skill_test_banks b WHERE b.organization_id=a.organization_id AND b.activity_version_id=a.id)
        ORDER BY a.position,a.slug`,
      [organizationId, [...courseVersionIds], skillKeys ? [...skillKeys] : null]
    );
    return result.rows.map((row) => ({
      activityVersionId: row.activity_version_id,
      courseVersionId: row.course_version_id,
      skillKey: row.skill_key
    }));
  }

  async requireBank(
    tx: DatabaseTransaction,
    organizationId: string,
    activityVersionId: string
  ) {
    const row = (
      await tx.client.query<{ questions: unknown }>(
        `SELECT b.config->'questions' AS questions
           FROM learning_content.skill_test_banks b
           JOIN learning_content.course_versions v ON v.organization_id=b.organization_id AND v.id=b.course_version_id
          WHERE b.organization_id=$1 AND b.activity_version_id=$2 AND v.status='published'`,
        [organizationId, activityVersionId]
      )
    ).rows[0];
    const parsed = row && questionsSchema.safeParse(row.questions);
    if (!parsed?.success)
      throw new ConflictException("Skill test bank is unavailable.");
    return parsed.data;
  }
}
