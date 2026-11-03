import { randomUUID } from "node:crypto";

import type { NestFastifyApplication } from "@nestjs/platform-fastify";
import {
  learnerSkillProgressReadModelSchema
} from "@platform/contracts";
import { createDatabasePool } from "@platform/database";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createApiApplication } from "./app.factory";
import {
  attachPlatformPrincipal,
  type PlatformPrincipalCarrier
} from "./request-context/platform-principal";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (value === undefined || value.trim().length === 0) {
    throw new Error(`${name} is required for learner skill progress integration tests.`);
  }
  return value;
}

type IdRow = { id: string };

describe("learner skill progress HTTP read model", () => {
  const migrationPool = createDatabasePool(
    requireEnv("DATABASE_MIGRATION_URL"),
    { applicationName: "learner-skill-progress-http-integration-fixtures" }
  );

  let app: NestFastifyApplication;
  let adminUserId = "";
  let learnerUserId = "";
  let instructorUserId = "";
  let organizationId = "";
  let courseVersionId = "";
  let offeringId = "";
  let enrollmentId = "";
  let submissionId = "";
  let unobservedSkillId = "";
  let observedSkillId = "";
  let assessedSkillId = "";
  const createdUserIds: string[] = [];

  async function createUser(label: string): Promise<string> {
    const result = await migrationPool.query<IdRow>(
      `INSERT INTO identity.users (email, display_name)
       VALUES ($1, $2)
       RETURNING id::text`,
      [`${label}-${randomUUID()}@example.test`, label]
    );
    const id = result.rows[0]?.id;
    if (id === undefined) {
      throw new Error("Failed to create learner skill progress test identity.");
    }
    createdUserIds.push(id);
    return id;
  }

  async function assignRole(userId: string, roleKey: string): Promise<void> {
    await migrationPool.query(
      `INSERT INTO access_control.role_assignments
         (organization_id, user_id, role_id, scope_type, scope_id, assigned_by_user_id)
       SELECT $1, $2, role.id, 'organization', $1, $3
         FROM access_control.roles AS role
        WHERE role.key = $4`,
      [organizationId, userId, adminUserId, roleKey]
    );
  }

  async function createSkill(
    keyPrefix: string,
    canonicalTitle: string
  ): Promise<string> {
    const result = await migrationPool.query<IdRow>(
      `INSERT INTO learning_content.skills
         (organization_id, skill_key, canonical_title, created_by_user_id)
       VALUES ($1, $2, $3, $4)
       RETURNING id::text`,
      [
        organizationId,
        `${keyPrefix}-${randomUUID()}`,
        canonicalTitle,
        adminUserId
      ]
    );
    const id = result.rows[0]?.id;
    if (id === undefined) {
      throw new Error("Failed to create learner skill progress test skill.");
    }
    return id;
  }

  beforeAll(async () => {
    adminUserId = await createUser("skill-progress-admin");
    learnerUserId = await createUser("skill-progress-learner");
    instructorUserId = await createUser("skill-progress-instructor");

    const organization = await migrationPool.query<IdRow>(
      `INSERT INTO organizations.organizations (slug, name, created_by_user_id)
       VALUES ($1, $2, $3)
       RETURNING id::text`,
      [`skill-progress-${randomUUID()}`, "Skill progress integration", adminUserId]
    );
    organizationId = organization.rows[0]?.id ?? "";
    if (organizationId.length === 0) {
      throw new Error("Failed to create learner skill progress test organization.");
    }

    for (const userId of [adminUserId, learnerUserId, instructorUserId]) {
      await migrationPool.query(
        `INSERT INTO organizations.memberships
           (organization_id, user_id, status, joined_at)
         VALUES ($1, $2, 'active', now())`,
        [organizationId, userId]
      );
    }

    await assignRole(adminUserId, "organization_admin");
    await assignRole(learnerUserId, "learner");
    await assignRole(instructorUserId, "instructor");

    const course = await migrationPool.query<IdRow>(
      `INSERT INTO learning_content.courses
         (organization_id, slug, created_by_user_id)
       VALUES ($1, $2, $3)
       RETURNING id::text`,
      [organizationId, `skill-progress-course-${randomUUID()}`, adminUserId]
    );
    const courseId = course.rows[0]?.id ?? "";

    const version = await migrationPool.query<IdRow>(
      `INSERT INTO learning_content.course_versions
         (organization_id, course_id, version_number, title, created_by_user_id)
       VALUES ($1, $2, 1, 'Skill progress course snapshot', $3)
       RETURNING id::text`,
      [organizationId, courseId, adminUserId]
    );
    courseVersionId = version.rows[0]?.id ?? "";

    unobservedSkillId = await createSkill(
      "skill-progress-unobserved",
      "Canonical unobserved title"
    );
    observedSkillId = await createSkill(
      "skill-progress-observed",
      "Canonical observed title"
    );
    assessedSkillId = await createSkill(
      "skill-progress-assessed",
      "Canonical assessed title"
    );

    await migrationPool.query(
      `INSERT INTO learning_content.course_version_skills
         (organization_id, course_version_id, skill_id, title, description, position)
       VALUES
         ($1, $2, $3, 'Snapshot unobserved', 'No evidence yet', 0),
         ($1, $2, $4, 'Snapshot observed', 'Qualitative evidence only', 1),
         ($1, $2, $5, 'Snapshot assessed', 'Scored evidence exists', 2)`,
      [
        organizationId,
        courseVersionId,
        unobservedSkillId,
        observedSkillId,
        assessedSkillId
      ]
    );

    const activity = await migrationPool.query<IdRow>(
      `INSERT INTO learning_content.activities
         (organization_id, course_id, created_by_user_id)
       VALUES ($1, $2, $3)
       RETURNING id::text`,
      [organizationId, courseId, adminUserId]
    );
    const activityId = activity.rows[0]?.id ?? "";

    const activityVersion = await migrationPool.query<IdRow>(
      `INSERT INTO learning_content.course_version_activities
         (organization_id, course_version_id, activity_id, slug,
          activity_type, title, config, position)
       VALUES ($1, $2, $3, 'skill-progress-assessment', 'test.manual',
               'Skill progress assessment', '{}'::jsonb, 0)
       RETURNING id::text`,
      [organizationId, courseVersionId, activityId]
    );
    const activityVersionId = activityVersion.rows[0]?.id ?? "";

    await migrationPool.query(
      `INSERT INTO learning_content.activity_skill_mappings
         (organization_id, course_version_id, activity_id, skill_id, role)
       VALUES
         ($1, $2, $3, $4, 'primary'),
         ($1, $2, $3, $5, 'primary')`,
      [
        organizationId,
        courseVersionId,
        activityId,
        observedSkillId,
        assessedSkillId
      ]
    );

    await migrationPool.query(
      `UPDATE learning_content.course_versions
          SET status = 'published',
              published_by_user_id = $1,
              published_at = now()
        WHERE organization_id = $2
          AND id = $3`,
      [adminUserId, organizationId, courseVersionId]
    );

    const offering = await migrationPool.query<IdRow>(
      `INSERT INTO learning_delivery.learning_offerings
         (organization_id, course_version_id, slug, name, delivery_mode, created_by_user_id)
       VALUES ($1, $2, $3, 'Skill progress offering', 'self_paced', $4)
       RETURNING id::text`,
      [
        organizationId,
        courseVersionId,
        `skill-progress-offering-${randomUUID()}`,
        adminUserId
      ]
    );
    offeringId = offering.rows[0]?.id ?? "";

    const enrollment = await migrationPool.query<IdRow>(
      `INSERT INTO learning_delivery.enrollments
         (organization_id, offering_id, user_id, created_by_user_id)
       VALUES ($1, $2, $3, $4)
       RETURNING id::text`,
      [organizationId, offeringId, learnerUserId, adminUserId]
    );
    enrollmentId = enrollment.rows[0]?.id ?? "";

    const attempt = await migrationPool.query<IdRow>(
      `INSERT INTO learning_progress.attempts
         (organization_id, enrollment_id, activity_version_id, attempt_number)
       VALUES ($1, $2, $3, 1)
       RETURNING id::text`,
      [organizationId, enrollmentId, activityVersionId]
    );
    const attemptId = attempt.rows[0]?.id ?? "";

    const submission = await migrationPool.query<IdRow>(
      `INSERT INTO learning_progress.submissions
         (organization_id, attempt_id, payload, submitted_by_user_id)
       VALUES ($1, $2, '{}'::jsonb, $3)
       RETURNING id::text`,
      [organizationId, attemptId, learnerUserId]
    );
    submissionId = submission.rows[0]?.id ?? "";

    app = await createApiApplication();
    app.getHttpAdapter()
      .getInstance()
      .addHook("onRequest", async (request) => {
        const testUserId = request.headers["x-test-user-id"];
        if (typeof testUserId === "string" && testUserId.length > 0) {
          attachPlatformPrincipal(request as PlatformPrincipalCarrier, {
            userId: testUserId
          });
        }
      });
    await app.init();

    const observedEvidence = await app.inject({
      method: "POST",
      url: `/v1/organizations/${organizationId}/submissions/${submissionId}/evidence`,
      headers: { "x-test-user-id": instructorUserId },
      payload: {
        skillId: observedSkillId,
        kind: "mentor-observation",
        payload: { note: "qualitative signal" }
      }
    });
    expect(observedEvidence.statusCode).toBe(201);

    const assessedEvidence = await app.inject({
      method: "POST",
      url: `/v1/organizations/${organizationId}/submissions/${submissionId}/evidence`,
      headers: { "x-test-user-id": instructorUserId },
      payload: {
        skillId: assessedSkillId,
        kind: "manual-review",
        score: 0.75
      }
    });
    expect(assessedEvidence.statusCode).toBe(201);
  });

  afterAll(async () => {
    if (app !== undefined) {
      await app.close();
    }

    if (organizationId.length > 0) {
      await migrationPool.query(
        `DELETE FROM learning_history.learning_events WHERE organization_id = $1`,
        [organizationId]
      );
      await migrationPool.query(
        `DELETE FROM events.outbox WHERE organization_id = $1`,
        [organizationId]
      );
      await migrationPool.query(
        `DELETE FROM learning_progress.mastery_projections WHERE organization_id = $1`,
        [organizationId]
      );
      await migrationPool.query(
        `DELETE FROM learning_progress.evidence WHERE organization_id = $1`,
        [organizationId]
      );
      await migrationPool.query(
        `DELETE FROM learning_progress.submissions WHERE organization_id = $1`,
        [organizationId]
      );
      await migrationPool.query(
        `DELETE FROM learning_progress.attempts WHERE organization_id = $1`,
        [organizationId]
      );
      await migrationPool.query(
        `DELETE FROM learning_delivery.enrollments WHERE organization_id = $1`,
        [organizationId]
      );
      await migrationPool.query(
        `DELETE FROM learning_delivery.learning_offerings WHERE organization_id = $1`,
        [organizationId]
      );
      await migrationPool.query(
        `DELETE FROM learning_content.activity_skill_mappings WHERE organization_id = $1`,
        [organizationId]
      );
      await migrationPool.query(
        `DELETE FROM learning_content.course_version_activities WHERE organization_id = $1`,
        [organizationId]
      );
      await migrationPool.query(
        `DELETE FROM learning_content.course_version_skills WHERE organization_id = $1`,
        [organizationId]
      );
      await migrationPool.query(
        `DELETE FROM learning_content.activities WHERE organization_id = $1`,
        [organizationId]
      );
      await migrationPool.query(
        `DELETE FROM learning_content.courses WHERE organization_id = $1`,
        [organizationId]
      );
      await migrationPool.query(
        `DELETE FROM learning_content.skills WHERE organization_id = $1`,
        [organizationId]
      );
      await migrationPool.query(
        `DELETE FROM organizations.organizations WHERE id = $1`,
        [organizationId]
      );
    }

    if (createdUserIds.length > 0) {
      await migrationPool.query(
        `DELETE FROM identity.users WHERE id = ANY($1::uuid[])`,
        [createdUserIds]
      );
    }
    await migrationPool.end();
  });

  it("returns every pinned course skill with honest learner-facing progress state", async () => {
    const response = await app.inject({
      method: "GET",
      url: `/v1/organizations/${organizationId}/enrollments/${enrollmentId}/skill-progress`,
      headers: { "x-test-user-id": learnerUserId }
    });

    expect(response.statusCode).toBe(200);
    const body = learnerSkillProgressReadModelSchema.parse(
      JSON.parse(response.body)
    );

    expect(body).toMatchObject({
      organizationId,
      enrollmentId,
      offeringId,
      courseVersionId
    });
    expect(body.skills).toHaveLength(3);
    expect(body.skills.map((skill) => skill.skillId)).toEqual([
      unobservedSkillId,
      observedSkillId,
      assessedSkillId
    ]);

    expect(body.skills[0]).toEqual({
      skillId: unobservedSkillId,
      title: "Snapshot unobserved",
      description: "No evidence yet",
      position: 0,
      state: "unobserved",
      masteryScore: null,
      evidenceCount: 0,
      scoredEvidenceCount: 0,
      lastEvidenceAt: null
    });
    expect(body.skills[1]).toMatchObject({
      skillId: observedSkillId,
      title: "Snapshot observed",
      description: "Qualitative evidence only",
      position: 1,
      state: "observed_unscored",
      masteryScore: null,
      evidenceCount: 1,
      scoredEvidenceCount: 0
    });
    expect(body.skills[1]?.lastEvidenceAt).not.toBeNull();
    expect(body.skills[2]).toMatchObject({
      skillId: assessedSkillId,
      title: "Snapshot assessed",
      description: "Scored evidence exists",
      position: 2,
      state: "assessed",
      masteryScore: 0.75,
      evidenceCount: 1,
      scoredEvidenceCount: 1
    });

    for (const skill of body.skills) {
      expect(skill).not.toHaveProperty("algorithmKey");
      expect(skill).not.toHaveProperty("algorithmVersion");
      expect(skill).not.toHaveProperty("computedAt");
    }
  });

  it("keeps the learner-facing endpoint own-Enrollment only", async () => {
    const response = await app.inject({
      method: "GET",
      url: `/v1/organizations/${organizationId}/enrollments/${enrollmentId}/skill-progress`,
      headers: { "x-test-user-id": instructorUserId }
    });

    expect(response.statusCode).toBe(403);
  });

  it("keeps current skill progress readable after Enrollment completion", async () => {
    await migrationPool.query(
      `UPDATE learning_delivery.enrollments
          SET status = 'completed',
              completed_at = now()
        WHERE organization_id = $1
          AND id = $2`,
      [organizationId, enrollmentId]
    );

    const response = await app.inject({
      method: "GET",
      url: `/v1/organizations/${organizationId}/enrollments/${enrollmentId}/skill-progress`,
      headers: { "x-test-user-id": learnerUserId }
    });

    expect(response.statusCode).toBe(200);
    const body = learnerSkillProgressReadModelSchema.parse(JSON.parse(response.body));
    expect(body.skills).toHaveLength(3);
    expect(body.skills[2]).toMatchObject({
      state: "assessed",
      masteryScore: 0.75
    });
  });
});
