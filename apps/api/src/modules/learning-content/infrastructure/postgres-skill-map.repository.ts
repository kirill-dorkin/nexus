import { Injectable } from "@nestjs/common";
import {
  skillMapPrerequisites,
  type SkillMapManifestV2
} from "@platform/contracts";
import type { DatabaseTransaction } from "@platform/database";

import { oneRow } from "../../../database/one-row";
import {
  SkillMapRepository,
  type SkillMapLessonLink,
  type SkillMapState
} from "../application/skill-map.repository";

@Injectable()
export class PostgresSkillMapRepository extends SkillMapRepository {
  async findState(
    tx: DatabaseTransaction,
    organizationId: string,
    mapSlug: string
  ): Promise<SkillMapState | null> {
    const map = await tx.client.query<{ id: string }>(
      `SELECT id::text AS id FROM learning_content.skill_maps
        WHERE organization_id = $1 AND slug = $2`,
      [organizationId, mapSlug]
    );
    const skillMapId = map.rows[0]?.id;
    if (!skillMapId) return null;
    const latest = await tx.client.query<{ version_number: number | null }>(
      `SELECT max(version_number) AS version_number
         FROM learning_content.skill_map_versions
        WHERE organization_id = $1 AND skill_map_id = $2`,
      [organizationId, skillMapId]
    );
    return {
      skillMapId,
      latestVersionNumber: latest.rows[0]?.version_number ?? null
    };
  }

  async missingSkillKeys(
    tx: DatabaseTransaction,
    organizationId: string,
    keys: readonly string[]
  ): Promise<string[]> {
    const result = await tx.client.query<{ key: string }>(
      `SELECT wanted.key
         FROM unnest($2::text[]) AS wanted(key)
        WHERE NOT EXISTS (
          SELECT 1 FROM learning_content.skills AS skill
           WHERE skill.organization_id = $1 AND skill.skill_key = wanted.key)
        ORDER BY wanted.key`,
      [organizationId, [...keys]]
    );
    return result.rows.map((row) => row.key);
  }

  async unpublishedLessons(
    tx: DatabaseTransaction,
    organizationId: string,
    links: readonly SkillMapLessonLink[]
  ): Promise<SkillMapLessonLink[]> {
    if (links.length === 0) return [];
    const result = await tx.client.query<{ course: string; slug: string }>(
      `SELECT wanted.course, wanted.slug
         FROM unnest($2::text[], $3::text[]) AS wanted(course, slug)
        WHERE NOT EXISTS (
          SELECT 1
            FROM learning_content.courses AS course
            JOIN learning_content.course_versions AS version
              ON version.organization_id = course.organization_id
             AND version.course_id = course.id
             AND version.status = 'published'
            JOIN learning_content.course_version_lessons AS placed
              ON placed.organization_id = version.organization_id
             AND placed.course_version_id = version.id
            JOIN learning_content.lessons AS lesson
              ON lesson.organization_id = placed.organization_id
             AND lesson.id = placed.lesson_id
           WHERE course.organization_id = $1
             AND course.slug = wanted.course
             AND lesson.slug = wanted.slug)
        ORDER BY wanted.course, wanted.slug`,
      [organizationId, links.map((l) => l.course), links.map((l) => l.slug)]
    );
    return result.rows;
  }

  async createMap(
    tx: DatabaseTransaction,
    input: { organizationId: string; slug: string; userId: string }
  ): Promise<string> {
    return oneRow(
      await tx.client.query<{ id: string }>(
        `INSERT INTO learning_content.skill_maps (organization_id, slug, created_by_user_id)
         VALUES ($1, $2, $3) RETURNING id::text AS id`,
        [input.organizationId, input.slug, input.userId]
      ),
      "skill map"
    ).id;
  }

  async publishVersion(
    tx: DatabaseTransaction,
    input: {
      organizationId: string;
      skillMapId: string;
      versionNumber: number;
      userId: string;
      manifest: SkillMapManifestV2;
    }
  ): Promise<{ versionId: string; prerequisites: number }> {
    const versionId = oneRow(
      await tx.client.query<{ id: string }>(
        `INSERT INTO learning_content.skill_map_versions
           (organization_id, skill_map_id, version_number, document, created_by_user_id)
         VALUES ($1, $2, $3, $4::jsonb, $5) RETURNING id::text AS id`,
        [
          input.organizationId,
          input.skillMapId,
          input.versionNumber,
          JSON.stringify(input.manifest),
          input.userId
        ]
      ),
      "skill map version"
    ).id;
    const edges = skillMapPrerequisites(input.manifest);
    const inserted = await tx.client.query(
      `INSERT INTO learning_content.skill_map_prerequisites
         (organization_id, skill_map_version_id, skill_id, requires_skill_id)
       SELECT $1, $2, skill.id, required.id
         FROM unnest($3::text[], $4::text[]) AS edge(skill_key, requires_key)
         JOIN learning_content.skills AS skill
           ON skill.organization_id = $1 AND skill.skill_key = edge.skill_key
         JOIN learning_content.skills AS required
           ON required.organization_id = $1 AND required.skill_key = edge.requires_key`,
      [
        input.organizationId,
        versionId,
        edges.map((e) => e.skillKey),
        edges.map((e) => e.requiresSkillKey)
      ]
    );
    if (inserted.rowCount !== edges.length)
      throw new Error("Skill map prerequisites did not resolve every skill.");
    await tx.client.query(
      `UPDATE learning_content.skill_map_versions
          SET status = 'published', published_by_user_id = $3, published_at = now()
        WHERE organization_id = $1 AND id = $2 AND status = 'draft'`,
      [input.organizationId, versionId, input.userId]
    );
    return { versionId, prerequisites: edges.length };
  }

  async readPublic(
    tx: DatabaseTransaction,
    organizationSlug: string,
    mapSlug: string
  ): Promise<unknown> {
    const result = await tx.client.query<{ document: unknown }>(
      "SELECT learning_content.read_public_skill_map($1, $2) AS document",
      [organizationSlug, mapSlug]
    );
    return result.rows[0]?.document ?? null;
  }
}
