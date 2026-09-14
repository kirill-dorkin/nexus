import { randomUUID } from "node:crypto";

import type { NestFastifyApplication } from "@nestjs/platform-fastify";
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
    throw new Error(`${name} is required for Mastery integration tests.`);
  }
  return value;
}

type IdRow = { id: string };
type EventRow = { event_name: string };

type MasteryBody = {
  organizationId: string;
  userId: string;
  skillId: string;
  algorithmKey: string;
  algorithmVersion: number;
  masteryScore: number | null;
  evidenceCount: number;
  scoredEvidenceCount: number;
  lastEvidenceAt: string;
  computedAt: string;
};

describe("Mastery projection and recomputation HTTP lifecycle", () => {
  const migrationPool = createDatabasePool(
    requireEnv("DATABASE_MIGRATION_URL"),
    { applicationName: "mastery-http-integration-fixtures" }
  );

  let app: NestFastifyApplication;
  let adminUserId = "";
  let learnerUserId = "";
  let instructorUserId = "";
  let organizationId = "";
  let skillId = "";
  let attemptId = "";
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
      throw new Error("Failed to create Mastery integration-test identity.");
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

  beforeAll(async () => {
    adminUserId = await createUser("mastery-admin");
    learnerUserId = await createUser("mastery-learner");
    instructorUserId = await createUser("mastery-instructor");

    const organization = await migrationPool.query<IdRow>(
      `INSERT INTO organizations.organizations (slug, name, created_by_user_id)
       VALUES ($1, $2, $3)
       RETURNING id::text`,
      [`mastery-${randomUUID()}`, "Mastery integration", adminUserId]
    );
    organizationId = organization.rows[0]?.id ?? "";
    if (organizationId.length === 0) {
      throw new Error("Failed to create Mastery integration-test organization.");
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
      [organizationId, `mastery-course-${randomUUID()}`, adminUserId]
    );
    const courseId = course.rows[0]?.id ?? "";

    const version = await migrationPool.query<IdRow>(
      `INSERT INTO learning_content.course_versions
         (organization_id, course_id, version_number, title, created_by_user_id)
       VALUES ($1, $2, 1, 'Mastery source course', $3)
       RETURNING id::text`,
      [organizationId, courseId, adminUserId]
    );
    const courseVersionId = version.rows[0]?.id ?? "";

    const skill = await migrationPool.query<IdRow>(
      `INSERT INTO learning_content.skills
         (organization_id, skill_key, canonical_title, created_by_user_id)
       VALUES ($1, $2, 'Mastery source skill', $3)
       RETURNING id::text`,
      [organizationId, `mastery-skill-${randomUUID()}`, adminUserId]
    );
    skillId = skill.rows[0]?.id ?? "";

    await migrationPool.query(
      `INSERT INTO learning_content.course_version_skills
         (organization_id, course_version_id, skill_id, title, position)
       VALUES ($1, $2, $3, 'Mastery source skill', 0)`,
      [organizationId, courseVersionId, skillId]
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
       VALUES ($1, $2, $3, 'mastery-assessment', 'test.manual',
               'Mastery assessment', '{}'::jsonb, 0)
       RETURNING id::text`,
      [organizationId, courseVersionId, activityId]
    );
    const activityVersionId = activityVersion.rows[0]?.id ?? "";

    await migrationPool.query(
      `INSERT INTO learning_content.activity_skill_mappings
         (organization_id, course_version_id, activity_id, skill_id, role)
       VALUES ($1, $2, $3, $4, 'primary')`,
      [organizationId, courseVersionId, activityId, skillId]
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
       VALUES ($1, $2, $3, 'Mastery self-paced', 'self_paced', $4)
       RETURNING id::text`,
      [organizationId, courseVersionId, `mastery-offering-${randomUUID()}`, adminUserId]
    );
    const offeringId = offering.rows[0]?.id ?? "";

    const enrollment = await migrationPool.query<IdRow>(
      `INSERT INTO learning_delivery.enrollments
         (organization_id, offering_id, user_id, created_by_user_id)
       VALUES ($1, $2, $3, $4)
       RETURNING id::text`,
      [organizationId, offeringId, learnerUserId, adminUserId]
    );
    const enrollmentId = enrollment.rows[0]?.id ?? "";

    const attempt = await migrationPool.query<IdRow>(
      `INSERT INTO learning_progress.attempts
         (organization_id, enrollment_id, activity_version_id, attempt_number, submission)
       VALUES ($1, $2, $3, 1, '{}'::jsonb)
       RETURNING id::text`,
      [organizationId, enrollmentId, activityVersionId]
    );
    attemptId = attempt.rows[0]?.id ?? "";

    app = await createApiApplication();
    app.getHttpAdapter()
      .getInstance()
      .addHook("onRequest", async (request) => {
        const testUserId = request.headers["x-test-user-id"];
        if (typeof testUserId === "string" && testUserId.length > 0) {
          attachPlatformPrincipal(
            request as PlatformPrincipalCarrier,
            { userId: testUserId }
          );
        }
      });
    await app.init();
  });

  afterAll(async () => {
    if (app !== undefined) {
      await app.close();
    }

    if (organizationId.length > 0) {
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

  it("starts without Mastery when the learner has no Evidence", async () => {
    const response = await app.inject({
      method: "GET",
      url: `/v1/organizations/${organizationId}/users/${learnerUserId}/mastery`,
      headers: { "x-test-user-id": learnerUserId }
    });

    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body)).toEqual([]);
  });

  it("materializes Mastery transactionally when scored Evidence is recorded", async () => {
    const evidence = await app.inject({
      method: "POST",
      url: `/v1/organizations/${organizationId}/attempts/${attemptId}/evidence`,
      headers: { "x-test-user-id": instructorUserId },
      payload: {
        skillId,
        kind: "manual-review",
        score: 0.8
      }
    });
    expect(evidence.statusCode).toBe(201);

    const response = await app.inject({
      method: "GET",
      url: `/v1/organizations/${organizationId}/users/${learnerUserId}/mastery`,
      headers: { "x-test-user-id": learnerUserId }
    });
    expect(response.statusCode).toBe(200);

    const rows = JSON.parse(response.body) as MasteryBody[];
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      organizationId,
      userId: learnerUserId,
      skillId,
      algorithmKey: "mean-scored-evidence",
      algorithmVersion: 1,
      masteryScore: 0.8,
      evidenceCount: 1,
      scoredEvidenceCount: 1
    });
  });

  it("serializes concurrent Evidence refreshes and ignores unscored Evidence in the mean", async () => {
    const [scored, unscored] = await Promise.all([
      app.inject({
        method: "POST",
        url: `/v1/organizations/${organizationId}/attempts/${attemptId}/evidence`,
        headers: { "x-test-user-id": instructorUserId },
        payload: {
          skillId,
          kind: "manual-review",
          score: 0.4
        }
      }),
      app.inject({
        method: "POST",
        url: `/v1/organizations/${organizationId}/attempts/${attemptId}/evidence`,
        headers: { "x-test-user-id": instructorUserId },
        payload: {
          skillId,
          kind: "mentor-observation",
          payload: { note: "qualitative evidence" }
        }
      })
    ]);

    expect(scored.statusCode).toBe(201);
    expect(unscored.statusCode).toBe(201);

    const response = await app.inject({
      method: "GET",
      url: `/v1/organizations/${organizationId}/users/${learnerUserId}/mastery`,
      headers: { "x-test-user-id": learnerUserId }
    });
    const rows = JSON.parse(response.body) as MasteryBody[];

    expect(response.statusCode).toBe(200);
    expect(rows[0]).toMatchObject({
      masteryScore: 0.6,
      evidenceCount: 3,
      scoredEvidenceCount: 2
    });
  });

  it("separates self Mastery reads from other-learner visibility", async () => {
    const learnerReadingOther = await app.inject({
      method: "GET",
      url: `/v1/organizations/${organizationId}/users/${adminUserId}/mastery`,
      headers: { "x-test-user-id": learnerUserId }
    });
    expect(learnerReadingOther.statusCode).toBe(403);

    const instructorReadingLearner = await app.inject({
      method: "GET",
      url: `/v1/organizations/${organizationId}/users/${learnerUserId}/mastery`,
      headers: { "x-test-user-id": instructorUserId }
    });
    expect(instructorReadingLearner.statusCode).toBe(200);
    expect(JSON.parse(instructorReadingLearner.body)).toHaveLength(1);
  });

  it("keeps explicit full recomputation privileged", async () => {
    const learnerRecompute = await app.inject({
      method: "POST",
      url: `/v1/organizations/${organizationId}/users/${learnerUserId}/mastery/recompute`,
      headers: { "x-test-user-id": learnerUserId }
    });
    expect(learnerRecompute.statusCode).toBe(403);
  });

  it("rebuilds the same projection entirely from append-only Evidence", async () => {
    await migrationPool.query(
      `DELETE FROM learning_progress.mastery_projections
        WHERE organization_id = $1
          AND user_id = $2`,
      [organizationId, learnerUserId]
    );

    const missing = await app.inject({
      method: "GET",
      url: `/v1/organizations/${organizationId}/users/${learnerUserId}/mastery`,
      headers: { "x-test-user-id": learnerUserId }
    });
    expect(missing.statusCode).toBe(200);
    expect(JSON.parse(missing.body)).toEqual([]);

    const recomputed = await app.inject({
      method: "POST",
      url: `/v1/organizations/${organizationId}/users/${learnerUserId}/mastery/recompute`,
      headers: { "x-test-user-id": adminUserId }
    });
    expect(recomputed.statusCode).toBe(200);

    const result = JSON.parse(recomputed.body) as {
      userId: string;
      projections: MasteryBody[];
    };
    expect(result.userId).toBe(learnerUserId);
    expect(result.projections).toHaveLength(1);
    expect(result.projections[0]).toMatchObject({
      organizationId,
      userId: learnerUserId,
      skillId,
      algorithmKey: "mean-scored-evidence",
      algorithmVersion: 1,
      masteryScore: 0.6,
      evidenceCount: 3,
      scoredEvidenceCount: 2
    });
  });

  it("records explicit recomputation in the transactional outbox", async () => {
    const result = await migrationPool.query<EventRow>(
      `SELECT event_name
         FROM events.outbox
        WHERE organization_id = $1
          AND event_name = 'mastery.recomputed'`,
      [organizationId]
    );

    expect(result.rows.map((row) => row.event_name)).toContain("mastery.recomputed");
  });
});
