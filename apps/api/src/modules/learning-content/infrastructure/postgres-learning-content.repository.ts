import { Injectable } from "@nestjs/common";
import type {
  Course,
  CourseVersion,
  CreateCourseResult
} from "@platform/contracts";
import type { DatabaseTransaction } from "@platform/database";

import {
  LearningContentRepository,
  type NewCourse,
  type NewCourseVersion
} from "../application/learning-content.repository";

type CourseRow = {
  id: string;
  organization_id: string;
  slug: string;
  status: Course["status"];
};

type CourseVersionRow = {
  id: string;
  organization_id: string;
  course_id: string;
  version_number: number;
  status: CourseVersion["status"];
  title: string;
  description: string | null;
  published_at: Date | null;
};

function mapCourse(row: CourseRow): Course {
  return {
    id: row.id,
    organizationId: row.organization_id,
    slug: row.slug,
    status: row.status
  };
}

function mapVersion(row: CourseVersionRow): CourseVersion {
  return {
    id: row.id,
    organizationId: row.organization_id,
    courseId: row.course_id,
    versionNumber: row.version_number,
    status: row.status,
    title: row.title,
    description: row.description,
    publishedAt: row.published_at?.toISOString() ?? null
  };
}

const versionReturning = `id::text,
  organization_id::text,
  course_id::text,
  version_number,
  status,
  title,
  description,
  published_at`;

@Injectable()
export class PostgresLearningContentRepository extends LearningContentRepository {
  async createCourseWithInitialDraft(
    transaction: DatabaseTransaction,
    course: NewCourse,
    version: NewCourseVersion
  ): Promise<CreateCourseResult> {
    const courseResult = await transaction.client.query<CourseRow>(
      `INSERT INTO learning_content.courses
         (id, organization_id, slug, created_by_user_id)
       VALUES ($1, $2, $3, $4)
       RETURNING id::text, organization_id::text, slug, status`,
      [course.id, course.organizationId, course.slug, course.createdByUserId]
    );
    const persistedCourse = courseResult.rows[0];
    if (persistedCourse === undefined) {
      throw new Error("PostgreSQL did not return the created course.");
    }

    const versionResult = await transaction.client.query<CourseVersionRow>(
      `INSERT INTO learning_content.course_versions
         (id, organization_id, course_id, version_number, title, description, created_by_user_id)
       VALUES ($1, $2, $3, 1, $4, $5, $6)
       RETURNING ${versionReturning}`,
      [
        version.id,
        version.organizationId,
        version.courseId,
        version.title,
        version.description,
        version.createdByUserId
      ]
    );
    const persistedVersion = versionResult.rows[0];
    if (persistedVersion === undefined) {
      throw new Error("PostgreSQL did not return the initial course draft.");
    }

    return {
      course: mapCourse(persistedCourse),
      draftVersion: mapVersion(persistedVersion)
    };
  }

  async createNextDraftVersion(
    transaction: DatabaseTransaction,
    version: NewCourseVersion
  ): Promise<CourseVersion | null> {
    const result = await transaction.client.query<CourseVersionRow>(
      `WITH locked_course AS (
         SELECT id
           FROM learning_content.courses
          WHERE organization_id = $1
            AND id = $2
          FOR UPDATE
       ), next_version AS (
         SELECT COALESCE(MAX(version_number), 0) + 1 AS version_number
           FROM learning_content.course_versions
          WHERE organization_id = $1
            AND course_id = $2
       )
       INSERT INTO learning_content.course_versions
         (id, organization_id, course_id, version_number, title, description, created_by_user_id)
       SELECT $3, $1, $2, next_version.version_number, $4, $5, $6
         FROM locked_course
         CROSS JOIN next_version
       RETURNING ${versionReturning}`,
      [
        version.organizationId,
        version.courseId,
        version.id,
        version.title,
        version.description,
        version.createdByUserId
      ]
    );
    const row = result.rows[0];
    return row === undefined ? null : mapVersion(row);
  }

  async publishDraftVersion(
    transaction: DatabaseTransaction,
    organizationId: string,
    courseId: string,
    versionId: string,
    publishedByUserId: string
  ): Promise<CourseVersion | null> {
    const result = await transaction.client.query<CourseVersionRow>(
      `UPDATE learning_content.course_versions
          SET status = 'published',
              published_by_user_id = $4,
              published_at = now(),
              updated_at = now()
        WHERE organization_id = $1
          AND course_id = $2
          AND id = $3
          AND status = 'draft'
       RETURNING ${versionReturning}`,
      [organizationId, courseId, versionId, publishedByUserId]
    );
    const row = result.rows[0];
    return row === undefined ? null : mapVersion(row);
  }

  async findCourse(
    transaction: DatabaseTransaction,
    organizationId: string,
    courseId: string
  ): Promise<Course | null> {
    const result = await transaction.client.query<CourseRow>(
      `SELECT id::text, organization_id::text, slug, status
         FROM learning_content.courses
        WHERE organization_id = $1
          AND id = $2`,
      [organizationId, courseId]
    );
    const row = result.rows[0];
    return row === undefined ? null : mapCourse(row);
  }

  async findVersion(
    transaction: DatabaseTransaction,
    organizationId: string,
    versionId: string
  ): Promise<CourseVersion | null> {
    const result = await transaction.client.query<CourseVersionRow>(
      `SELECT ${versionReturning}
         FROM learning_content.course_versions
        WHERE organization_id = $1
          AND id = $2`,
      [organizationId, versionId]
    );
    const row = result.rows[0];
    return row === undefined ? null : mapVersion(row);
  }

  async listPublishedVersionIds(
    transaction: DatabaseTransaction,
    organizationId: string,
    courseId: string
  ): Promise<readonly string[]> {
    const result = await transaction.client.query<{ id: string }>(
      `SELECT id::text
         FROM learning_content.course_versions
        WHERE organization_id = $1
          AND course_id = $2
          AND status = 'published'
        ORDER BY version_number ASC`,
      [organizationId, courseId]
    );
    return result.rows.map((row) => row.id);
  }
}
