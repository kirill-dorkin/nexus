import { Injectable } from "@nestjs/common";
import type {
  CourseVersionActivity,
  CourseVersionSkill,
  GuidedBuildAuthoring,
  GuidedBuildProtectedDefinition,
  Skill
} from "@platform/contracts";
import type { DatabaseTransaction } from "@platform/database";
import {
  LearningGraphRepository,
  type CourseVersionSkillRemediation,
  type NewCourseVersionActivity,
  type NewSkill
} from "../application/learning-graph.repository";

type SkillRow = { id: string; organization_id: string; skill_key: string; canonical_title: string; canonical_description: string | null; status: Skill["status"] };
type CourseVersionSkillRow = { organization_id: string; course_version_id: string; skill_id: string; title: string; description: string | null; position: number };
type ActivityRow = { id: string; organization_id: string; course_version_id: string; activity_id: string; slug: string; activity_type: string; title: string; instructions: string | null; config: Record<string, unknown>; position: number; skill_ids: string[] | null };
type RemediationRow = { organization_id: string; course_version_id: string; skill_id: string; activity_id: string; position: number };
type GuidedDefinitionRow = { schema_version: 1; activity_version_id: string; professional_solution_key: string; professional_solution_title: string; professional_solution_content: Record<string, unknown>; transfer_activity_version_id: string | null };
type GuidedStepRow = { step_key: string; title: string; instructions: string | null; hint_key: string | null; content: Record<string, unknown> | null };

function mapSkill(row: SkillRow): Skill { return { id: row.id, organizationId: row.organization_id, key: row.skill_key, title: row.canonical_title, description: row.canonical_description, status: row.status }; }
function mapVersionSkill(row: CourseVersionSkillRow): CourseVersionSkill { return { organizationId: row.organization_id, courseVersionId: row.course_version_id, skillId: row.skill_id, title: row.title, description: row.description, position: row.position }; }
function mapActivity(row: ActivityRow): CourseVersionActivity { return { id: row.id, organizationId: row.organization_id, courseVersionId: row.course_version_id, activityId: row.activity_id, slug: row.slug, activityType: row.activity_type, title: row.title, instructions: row.instructions, config: row.config, position: row.position, skillIds: row.skill_ids ?? [] }; }
function mapRemediation(row: RemediationRow): CourseVersionSkillRemediation { return { organizationId: row.organization_id, courseVersionId: row.course_version_id, skillId: row.skill_id, activityId: row.activity_id, position: row.position }; }
const activitySelect = `activity.id::text, activity.organization_id::text, activity.course_version_id::text, activity.activity_id::text, activity.slug, activity.activity_type, activity.title, activity.instructions, activity.config, activity.position, COALESCE(array_agg(mapping.skill_id::text ORDER BY mapping.skill_id) FILTER (WHERE mapping.skill_id IS NOT NULL), ARRAY[]::text[]) AS skill_ids`;

@Injectable()
export class PostgresLearningGraphRepository extends LearningGraphRepository {
  async createSkill(transaction: DatabaseTransaction, skill: NewSkill): Promise<Skill> {
    const result = await transaction.client.query<SkillRow>(`INSERT INTO learning_content.skills (id, organization_id, skill_key, canonical_title, canonical_description, created_by_user_id) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id::text, organization_id::text, skill_key, canonical_title, canonical_description, status`, [skill.id, skill.organizationId, skill.key, skill.title, skill.description, skill.createdByUserId]);
    const row = result.rows[0]; if (row === undefined) throw new Error("PostgreSQL did not return the created skill."); return mapSkill(row);
  }
  async attachSkill(transaction: DatabaseTransaction, organizationId: string, courseVersionId: string, skillId: string, position: number): Promise<CourseVersionSkill | null> {
    const result = await transaction.client.query<CourseVersionSkillRow>(`INSERT INTO learning_content.course_version_skills (organization_id, course_version_id, skill_id, title, description, position) SELECT $1,$2,skill.id,skill.canonical_title,skill.canonical_description,$4 FROM learning_content.skills AS skill WHERE skill.organization_id=$1 AND skill.id=$3 AND skill.status='active' RETURNING organization_id::text, course_version_id::text, skill_id::text, title, description, position`, [organizationId, courseVersionId, skillId, position]);
    const row = result.rows[0]; return row === undefined ? null : mapVersionSkill(row);
  }
  async findAttachedSkill(transaction: DatabaseTransaction, organizationId: string, courseVersionId: string, skillId: string): Promise<CourseVersionSkill | null> {
    const result = await transaction.client.query<CourseVersionSkillRow>(`SELECT organization_id::text, course_version_id::text, skill_id::text, title, description, position FROM learning_content.course_version_skills WHERE organization_id=$1 AND course_version_id=$2 AND skill_id=$3`, [organizationId, courseVersionId, skillId]);
    const row = result.rows[0]; return row === undefined ? null : mapVersionSkill(row);
  }
  async listCourseVersionSkills(transaction: DatabaseTransaction, organizationId: string, courseVersionId: string): Promise<readonly CourseVersionSkill[]> {
    const result = await transaction.client.query<CourseVersionSkillRow>(`SELECT organization_id::text, course_version_id::text, skill_id::text, title, description, position FROM learning_content.course_version_skills WHERE organization_id=$1 AND course_version_id=$2 ORDER BY position, skill_id`, [organizationId, courseVersionId]);
    return result.rows.map(mapVersionSkill);
  }
  async createActivity(transaction: DatabaseTransaction, activity: NewCourseVersionActivity): Promise<CourseVersionActivity> {
    await transaction.client.query(`INSERT INTO learning_content.activities (id, organization_id, course_id, created_by_user_id) VALUES ($1,$2,$3,$4)`, [activity.activityId, activity.organizationId, activity.courseId, activity.createdByUserId]);
    await transaction.client.query(`INSERT INTO learning_content.course_version_activities (id, organization_id, course_version_id, activity_id, slug, activity_type, title, instructions, config, position) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,$10)`, [activity.id, activity.organizationId, activity.courseVersionId, activity.activityId, activity.slug, activity.activityType, activity.title, activity.instructions, JSON.stringify(activity.config), activity.position]);
    await transaction.client.query(`INSERT INTO learning_content.activity_skill_mappings (organization_id, course_version_id, activity_id, skill_id) SELECT $1,$2,$3,skill_id FROM unnest($4::uuid[]) AS skill_id`, [activity.organizationId, activity.courseVersionId, activity.activityId, [...activity.skillIds]]);
    const persisted = await this.findActivityVersion(transaction, activity.organizationId, activity.courseVersionId, activity.activityId);
    if (persisted === null) throw new Error("PostgreSQL did not return the created activity snapshot.");
    return persisted;
  }
  async createGuidedBuildDefinition(transaction: DatabaseTransaction, organizationId: string, activityVersionId: string, definition: GuidedBuildAuthoring): Promise<void> {
    await transaction.client.query(`INSERT INTO learning_content.guided_build_definitions (organization_id, activity_version_id, schema_version, professional_solution_key, professional_solution_title, professional_solution_content, transfer_activity_version_id) VALUES ($1,$2,$3,$4,$5,$6::jsonb,$7)`, [organizationId, activityVersionId, definition.schemaVersion, definition.professionalSolution.key, definition.professionalSolution.title, JSON.stringify(definition.professionalSolution.content), definition.transferActivityVersionId ?? null]);
    for (const [stepPosition, step] of definition.steps.entries()) {
      await transaction.client.query(`INSERT INTO learning_content.guided_build_steps (organization_id, activity_version_id, step_key, position, title, instructions) VALUES ($1,$2,$3,$4,$5,$6)`, [organizationId, activityVersionId, step.key, stepPosition, step.title, step.instructions ?? null]);
      for (const [hintPosition, hint] of step.hints.entries()) {
        await transaction.client.query(`INSERT INTO learning_content.guided_build_hints (organization_id, activity_version_id, step_key, hint_key, position, content) VALUES ($1,$2,$3,$4,$5,$6::jsonb)`, [organizationId, activityVersionId, step.key, hint.key, hintPosition, JSON.stringify(hint.content)]);
      }
    }
  }
  async findGuidedBuildDefinition(transaction: DatabaseTransaction, organizationId: string, activityVersionId: string): Promise<GuidedBuildProtectedDefinition | null> {
    const definitionResult = await transaction.client.query<GuidedDefinitionRow>(`SELECT schema_version, activity_version_id::text, professional_solution_key, professional_solution_title, professional_solution_content, transfer_activity_version_id::text FROM learning_content.guided_build_definitions WHERE organization_id=$1 AND activity_version_id=$2`, [organizationId, activityVersionId]);
    const definition = definitionResult.rows[0]; if (definition === undefined) return null;
    const rows = await transaction.client.query<GuidedStepRow>(`SELECT step.step_key, step.title, step.instructions, hint.hint_key, hint.content FROM learning_content.guided_build_steps AS step LEFT JOIN learning_content.guided_build_hints AS hint ON hint.organization_id=step.organization_id AND hint.activity_version_id=step.activity_version_id AND hint.step_key=step.step_key WHERE step.organization_id=$1 AND step.activity_version_id=$2 ORDER BY step.position, hint.position`, [organizationId, activityVersionId]);
    const steps: GuidedBuildProtectedDefinition["steps"][number][] = [];
    for (const row of rows.rows) {
      let step = steps.find((candidate) => candidate.key === row.step_key);
      if (step === undefined) {
        step = { key: row.step_key, title: row.title, instructions: row.instructions, hints: [] };
        steps.push(step);
      }
      if (row.hint_key !== null && row.content !== null) step.hints.push({ key: row.hint_key, content: row.content });
    }
    return { schemaVersion: definition.schema_version, activityVersionId: definition.activity_version_id, steps, professionalSolution: { key: definition.professional_solution_key, title: definition.professional_solution_title, content: definition.professional_solution_content }, transferActivityVersionId: definition.transfer_activity_version_id };
  }
  async findActivityVersion(transaction: DatabaseTransaction, organizationId: string, courseVersionId: string, activityId: string): Promise<CourseVersionActivity | null> {
    const result = await transaction.client.query<ActivityRow>(`SELECT ${activitySelect} FROM learning_content.course_version_activities AS activity LEFT JOIN learning_content.activity_skill_mappings AS mapping ON mapping.organization_id=activity.organization_id AND mapping.course_version_id=activity.course_version_id AND mapping.activity_id=activity.activity_id WHERE activity.organization_id=$1 AND activity.course_version_id=$2 AND activity.activity_id=$3 GROUP BY activity.id`, [organizationId, courseVersionId, activityId]);
    const row = result.rows[0]; return row === undefined ? null : mapActivity(row);
  }
  async findActivityVersionById(transaction: DatabaseTransaction, organizationId: string, activityVersionId: string): Promise<CourseVersionActivity | null> {
    const result = await transaction.client.query<ActivityRow>(`SELECT ${activitySelect} FROM learning_content.course_version_activities AS activity LEFT JOIN learning_content.activity_skill_mappings AS mapping ON mapping.organization_id=activity.organization_id AND mapping.course_version_id=activity.course_version_id AND mapping.activity_id=activity.activity_id WHERE activity.organization_id=$1 AND activity.id=$2 GROUP BY activity.id`, [organizationId, activityVersionId]);
    const row = result.rows[0]; return row === undefined ? null : mapActivity(row);
  }
  async listCourseVersionActivities(transaction: DatabaseTransaction, organizationId: string, courseVersionId: string): Promise<readonly CourseVersionActivity[]> {
    const result = await transaction.client.query<ActivityRow>(`SELECT ${activitySelect} FROM learning_content.course_version_activities AS activity LEFT JOIN learning_content.activity_skill_mappings AS mapping ON mapping.organization_id=activity.organization_id AND mapping.course_version_id=activity.course_version_id AND mapping.activity_id=activity.activity_id WHERE activity.organization_id=$1 AND activity.course_version_id=$2 GROUP BY activity.id ORDER BY activity.position, activity.activity_id`, [organizationId, courseVersionId]);
    return result.rows.map(mapActivity);
  }
  async listCourseVersionSkillRemediations(transaction: DatabaseTransaction, organizationId: string, courseVersionId: string): Promise<readonly CourseVersionSkillRemediation[]> {
    const result = await transaction.client.query<RemediationRow>(`SELECT organization_id::text, course_version_id::text, skill_id::text, activity_id::text, position FROM learning_content.course_version_skill_remediations WHERE organization_id=$1 AND course_version_id=$2 ORDER BY skill_id, position, activity_id`, [organizationId, courseVersionId]);
    return result.rows.map(mapRemediation);
  }
  async replaceCourseVersionSkillRemediations(transaction: DatabaseTransaction, organizationId: string, courseVersionId: string, skillId: string, activityIds: readonly string[]): Promise<readonly CourseVersionSkillRemediation[]> {
    await transaction.client.query(`DELETE FROM learning_content.course_version_skill_remediations WHERE organization_id=$1 AND course_version_id=$2 AND skill_id=$3`, [organizationId, courseVersionId, skillId]);
    if (activityIds.length > 0) {
      await transaction.client.query(
        `INSERT INTO learning_content.course_version_skill_remediations (organization_id, course_version_id, skill_id, activity_id, position)
         SELECT $1, $2, $3, input.activity_id, input.position
           FROM unnest($4::uuid[]) WITH ORDINALITY AS input(activity_id, ordinal)
          CROSS JOIN LATERAL (SELECT (input.ordinal - 1)::integer AS position) AS numbered`,
        [organizationId, courseVersionId, skillId, [...activityIds]]
      );
    }
    const result = await transaction.client.query<RemediationRow>(`SELECT organization_id::text, course_version_id::text, skill_id::text, activity_id::text, position FROM learning_content.course_version_skill_remediations WHERE organization_id=$1 AND course_version_id=$2 AND skill_id=$3 ORDER BY position, activity_id`, [organizationId, courseVersionId, skillId]);
    return result.rows.map(mapRemediation);
  }
  async activityAssessesSkill(transaction: DatabaseTransaction, organizationId: string, activityVersionId: string, skillId: string): Promise<boolean> {
    const result = await transaction.client.query<{ exists: boolean }>(`SELECT EXISTS (SELECT 1 FROM learning_content.course_version_activities AS activity JOIN learning_content.activity_skill_mappings AS mapping ON mapping.organization_id=activity.organization_id AND mapping.course_version_id=activity.course_version_id AND mapping.activity_id=activity.activity_id WHERE activity.organization_id=$1 AND activity.id=$2 AND mapping.skill_id=$3) AS exists`, [organizationId, activityVersionId, skillId]);
    return result.rows[0]?.exists ?? false;
  }
  async cloneLatestPublishedGraph(transaction: DatabaseTransaction, organizationId: string, courseId: string, targetCourseVersionId: string): Promise<void> {
    const sourceVersionSql = `SELECT id FROM learning_content.course_versions WHERE organization_id=$1 AND course_id=$2 AND status='published' ORDER BY version_number DESC LIMIT 1`;
    await transaction.client.query(`WITH source_version AS (${sourceVersionSql}) INSERT INTO learning_content.course_version_skills (organization_id, course_version_id, skill_id, title, description, position) SELECT skill.organization_id,$3,skill.skill_id,skill.title,skill.description,skill.position FROM learning_content.course_version_skills AS skill JOIN source_version ON source_version.id=skill.course_version_id`, [organizationId, courseId, targetCourseVersionId]);
    await transaction.client.query(`WITH source_version AS (${sourceVersionSql}) INSERT INTO learning_content.course_version_activities (organization_id, course_version_id, activity_id, slug, activity_type, title, instructions, config, position) SELECT activity.organization_id,$3,activity.activity_id,activity.slug,activity.activity_type,activity.title,activity.instructions,activity.config,activity.position FROM learning_content.course_version_activities AS activity JOIN source_version ON source_version.id=activity.course_version_id`, [organizationId, courseId, targetCourseVersionId]);
    await transaction.client.query(`WITH source_version AS (${sourceVersionSql}) INSERT INTO learning_content.activity_skill_mappings (organization_id, course_version_id, activity_id, skill_id, role) SELECT mapping.organization_id,$3,mapping.activity_id,mapping.skill_id,mapping.role FROM learning_content.activity_skill_mappings AS mapping JOIN source_version ON source_version.id=mapping.course_version_id`, [organizationId, courseId, targetCourseVersionId]);
    await transaction.client.query(`WITH source_version AS (${sourceVersionSql}) INSERT INTO learning_content.course_version_skill_remediations (organization_id, course_version_id, skill_id, activity_id, position) SELECT remediation.organization_id,$3,remediation.skill_id,remediation.activity_id,remediation.position FROM learning_content.course_version_skill_remediations AS remediation JOIN source_version ON source_version.id=remediation.course_version_id`, [organizationId, courseId, targetCourseVersionId]);
    await transaction.client.query(`WITH source_version AS (${sourceVersionSql}) INSERT INTO learning_content.guided_build_definitions (organization_id, activity_version_id, schema_version, professional_solution_key, professional_solution_title, professional_solution_content, transfer_activity_version_id) SELECT definition.organization_id,target.id,definition.schema_version,definition.professional_solution_key,definition.professional_solution_title,definition.professional_solution_content,target_transfer.id FROM learning_content.guided_build_definitions AS definition JOIN learning_content.course_version_activities AS source ON source.organization_id=definition.organization_id AND source.id=definition.activity_version_id JOIN source_version ON source_version.id=source.course_version_id JOIN learning_content.course_version_activities AS target ON target.organization_id=source.organization_id AND target.course_version_id=$3 AND target.activity_id=source.activity_id LEFT JOIN learning_content.course_version_activities AS source_transfer ON source_transfer.organization_id=definition.organization_id AND source_transfer.id=definition.transfer_activity_version_id LEFT JOIN learning_content.course_version_activities AS target_transfer ON target_transfer.organization_id=source_transfer.organization_id AND target_transfer.course_version_id=$3 AND target_transfer.activity_id=source_transfer.activity_id`, [organizationId, courseId, targetCourseVersionId]);
    await transaction.client.query(`WITH source_version AS (${sourceVersionSql}) INSERT INTO learning_content.guided_build_steps (organization_id, activity_version_id, step_key, position, title, instructions) SELECT step.organization_id,target.id,step.step_key,step.position,step.title,step.instructions FROM learning_content.guided_build_steps AS step JOIN learning_content.course_version_activities AS source ON source.organization_id=step.organization_id AND source.id=step.activity_version_id JOIN source_version ON source_version.id=source.course_version_id JOIN learning_content.course_version_activities AS target ON target.organization_id=source.organization_id AND target.course_version_id=$3 AND target.activity_id=source.activity_id`, [organizationId, courseId, targetCourseVersionId]);
    await transaction.client.query(`WITH source_version AS (${sourceVersionSql}) INSERT INTO learning_content.guided_build_hints (organization_id, activity_version_id, step_key, hint_key, position, content) SELECT hint.organization_id,target.id,hint.step_key,hint.hint_key,hint.position,hint.content FROM learning_content.guided_build_hints AS hint JOIN learning_content.course_version_activities AS source ON source.organization_id=hint.organization_id AND source.id=hint.activity_version_id JOIN source_version ON source_version.id=source.course_version_id JOIN learning_content.course_version_activities AS target ON target.organization_id=source.organization_id AND target.course_version_id=$3 AND target.activity_id=source.activity_id`, [organizationId, courseId, targetCourseVersionId]);
  }
}
