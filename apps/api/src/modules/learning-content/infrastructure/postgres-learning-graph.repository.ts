import { Injectable } from "@nestjs/common";
import type {
  CourseVersionActivity,
  CourseVersionSkill,
  Skill
} from "@platform/contracts";
import type { DatabaseTransaction } from "@platform/database";

import {
  LearningGraphRepository,
  type NewCourseVersionActivity,
  type NewSkill
} from "../application/learning-graph.repository";

type SkillRow = {
  id: string;
  organization_id: string;
  skill_key: string;
  canonical_title: string;
  canonical_description: string | null;
  status: Skill["status"];
};

type CourseVersionSkillRow = {
  organization_id: string;
  course_version_id: string;
  skill_id: string;
  title: string;
  description: string | null;
  position: number;
};

type ActivityRow = {
  id: string;
  organization_id: string;
  course_version_id: string;
  activity_id: string;
  slug: string;
  activity_type: string;
  title: string;
  instructions: string | null;
  config: Record<string, unknown>;
  position: number;
  skill_ids: string[] | null;
};

function mapSkill(row: SkillRow): Skill {
  return {
    id: row.id,
    organizationId: row.organization_id,
    key: row.skill_key,
    title: row.canonical_title,
    description: row.canonical_description,
    status: row.status
  };
}

function mapVersionSkill(row: CourseVersionSkillRow): CourseVersionSkill {
  return {
    organizationId: row.organization_id,
    courseVersionId: row.course_version_id,
    skillId: row.skill_id,
    title: row.title,
    description: row.description,
    position: row.position
  };
}

function mapActivity(row: ActivityRow): CourseVersionActivity {
  return {
    id: row.id,
    organizationId: row.organization_id,
    courseVersionId: row.course_version_id,
    activityId: row.activity_id,
    slug: row.slug,
    activityType: row.activity_type,
    title: row.title,
    instructions: row.instructions,
    config: row.config,
    position: row.position,
    skillIds: row.skill_ids ?? []
  };
}

const activitySelect = `activity.id::text,
  activity.organization_id::text,
  activity.course_version_id::text,
  activity.activity_id::text,
  activity.slug,
  activity.activity_type,
  activity.title,
  activity.instructions,
  activity.config,
  activity.position,
  COALESCE(array_agg(mapping.skill_id::text ORDER BY mapping.skill_id)
    FILTER (WHERE mapping.skill_id IS NOT NULL), ARRAY[]::text[]) AS skill_ids`;

@Injectable()
export class PostgresLearningGraphRepository extends LearningGraphRepository {
  async createSkill(
    transaction: DatabaseTransaction,
    skill: NewSkill
  ): Promise<Skill> {
    const result = await transaction.client.query<SkillRow>(
      `INSERT INTO learning_content.skills
         (id, organization_id, skill_key, canonical_title, canonical_description, created_by_user_id)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id::text, organization_id::text, skill_key,
                 canonical_title, canonical_description, status`,
      [
        skill.id,
        skill.organizationId,
        skill.key,
        skill.title,
        skill.description,
        skill.createdByUserId
      ]
    );
    const row = result.rows[0];
    if (row === undefined) {
      throw new Error("PostgreSQL did not return the created skill.");
    }
    return mapSkill(row);
  }

  async attachSkill(
    transaction: DatabaseTransaction,
    organizationId: string,
    courseVersionId: string,
    skillId: string,
    position: number
  ): Promise<CourseVersionSkill | null> {
    const result = await transaction.client.query<CourseVersionSkillRow>(
      `INSERT INTO learning_content.course_version_skills
         (organization_id, course_version_id, skill_id, title, description, position)
       SELECT $1, $2, skill.id, skill.canonical_title, skill.canonical_description, $4
         FROM learning_content.skills AS skill
        WHERE skill.organization_id = $1
          AND skill.id = $3
          AND skill.status = 'active'
       RETURNING organization_id::text, course_version_id::text, skill_id::text,
                 title, description, position`,
      [organizationId, courseVersionId, skillId, position]
    );
    const row = result.rows[0];
    return row === undefined ? null : mapVersionSkill(row);
  }

  async findAttachedSkill(
    transaction: DatabaseTransaction,
    organizationId: string,
    courseVersionId: string,
    skillId: string
  ): Promise<CourseVersionSkill | null> {
    const result = await transaction.client.query<CourseVersionSkillRow>(
      `SELECT organization_id::text, course_version_id::text, skill_id::text,
              title, description, position
         FROM learning_content.course_version_skills
        WHERE organization_id = $1
          AND course_version_id = $2
          AND skill_id = $3`,
      [organizationId, courseVersionId, skillId]
    );
    const row = result.rows[0];
    return row === undefined ? null : mapVersionSkill(row);
  }

  async createActivity(
    transaction: DatabaseTransaction,
    activity: NewCourseVersionActivity
  ): Promise<CourseVersionActivity> {
    await transaction.client.query(
      `INSERT INTO learning_content.activities
         (id, organization_id, course_id, created_by_user_id)
       VALUES ($1, $2, $3, $4)`,
      [
        activity.activityId,
        activity.organizationId,
        activity.courseId,
        activity.createdByUserId
      ]
    );

    await transaction.client.query(
      `INSERT INTO learning_content.course_version_activities
         (id, organization_id, course_version_id, activity_id, slug,
          activity_type, title, instructions, config, position)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, $10)`,
      [
        activity.id,
        activity.organizationId,
        activity.courseVersionId,
        activity.activityId,
        activity.slug,
        activity.activityType,
        activity.title,
        activity.instructions,
        JSON.stringify(activity.config),
        activity.position
      ]
    );

    await transaction.client.query(
      `INSERT INTO learning_content.activity_skill_mappings
         (organization_id, course_version_id, activity_id, skill_id)
       SELECT $1, $2, $3, skill_id
         FROM unnest($4::uuid[]) AS skill_id`,
      [
        activity.organizationId,
        activity.courseVersionId,
        activity.activityId,
        [...activity.skillIds]
      ]
    );

    const persisted = await this.findActivityVersion(
      transaction,
      activity.organizationId,
      activity.courseVersionId,
      activity.activityId
    );
    if (persisted === null) {
      throw new Error("PostgreSQL did not return the created activity snapshot.");
    }
    return persisted;
  }

  async findActivityVersion(
    transaction: DatabaseTransaction,
    organizationId: string,
    courseVersionId: string,
    activityId: string
  ): Promise<CourseVersionActivity | null> {
    const result = await transaction.client.query<ActivityRow>(
      `SELECT ${activitySelect}
         FROM learning_content.course_version_activities AS activity
         LEFT JOIN learning_content.activity_skill_mappings AS mapping
           ON mapping.organization_id = activity.organization_id
          AND mapping.course_version_id = activity.course_version_id
          AND mapping.activity_id = activity.activity_id
        WHERE activity.organization_id = $1
          AND activity.course_version_id = $2
          AND activity.activity_id = $3
        GROUP BY activity.id`,
      [organizationId, courseVersionId, activityId]
    );
    const row = result.rows[0];
    return row === undefined ? null : mapActivity(row);
  }

  async activityAssessesSkill(
    transaction: DatabaseTransaction,
    organizationId: string,
    activityVersionId: string,
    skillId: string
  ): Promise<boolean> {
    const result = await transaction.client.query<{ exists: boolean }>(
      `SELECT EXISTS (
         SELECT 1
           FROM learning_content.course_version_activities AS activity
           JOIN learning_content.activity_skill_mappings AS mapping
             ON mapping.organization_id = activity.organization_id
            AND mapping.course_version_id = activity.course_version_id
            AND mapping.activity_id = activity.activity_id
          WHERE activity.organization_id = $1
            AND activity.id = $2
            AND mapping.skill_id = $3
       ) AS exists`,
      [organizationId, activityVersionId, skillId]
    );
    return result.rows[0]?.exists ?? false;
  }

  async cloneLatestPublishedGraph(
    transaction: DatabaseTransaction,
    organizationId: string,
    courseId: string,
    targetCourseVersionId: string
  ): Promise<void> {
    const sourceVersionSql = `SELECT id
      FROM learning_content.course_versions
     WHERE organization_id = $1
       AND course_id = $2
       AND status = 'published'
     ORDER BY version_number DESC
     LIMIT 1`;

    await transaction.client.query(
      `WITH source_version AS (${sourceVersionSql})
       INSERT INTO learning_content.course_version_skills
         (organization_id, course_version_id, skill_id, title, description, position)
       SELECT skill.organization_id, $3, skill.skill_id,
              skill.title, skill.description, skill.position
         FROM learning_content.course_version_skills AS skill
         JOIN source_version ON source_version.id = skill.course_version_id`,
      [organizationId, courseId, targetCourseVersionId]
    );

    await transaction.client.query(
      `WITH source_version AS (${sourceVersionSql})
       INSERT INTO learning_content.course_version_activities
         (organization_id, course_version_id, activity_id, slug,
          activity_type, title, instructions, config, position)
       SELECT activity.organization_id, $3, activity.activity_id, activity.slug,
              activity.activity_type, activity.title, activity.instructions,
              activity.config, activity.position
         FROM learning_content.course_version_activities AS activity
         JOIN source_version ON source_version.id = activity.course_version_id`,
      [organizationId, courseId, targetCourseVersionId]
    );

    await transaction.client.query(
      `WITH source_version AS (${sourceVersionSql})
       INSERT INTO learning_content.activity_skill_mappings
         (organization_id, course_version_id, activity_id, skill_id, role)
       SELECT mapping.organization_id, $3, mapping.activity_id,
              mapping.skill_id, mapping.role
         FROM learning_content.activity_skill_mappings AS mapping
         JOIN source_version ON source_version.id = mapping.course_version_id`,
      [organizationId, courseId, targetCourseVersionId]
    );
  }
}
