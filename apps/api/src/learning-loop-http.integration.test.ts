import { randomUUID } from "node:crypto";

import type { NestFastifyApplication } from "@nestjs/platform-fastify";
import { createDatabasePool } from "@platform/database";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createTestOrganization } from "./test-support/create-test-organization";
import { createApiApplication } from "./app.factory";
import {
  attachPlatformPrincipal,
  type PlatformPrincipalCarrier
} from "./request-context/platform-principal";
import {
  evidenceUrlForAttempt,
  startAndSubmitAttempt
} from "./test-support/start-and-submit-attempt";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (value === undefined || value.trim().length === 0) {
    throw new Error(`${name} is required for learning-loop integration tests.`);
  }
  return value;
}

type IdRow = { id: string };
type ActivityVersionRow = { id: string; activity_id: string };
type PrivilegeRow = {
  can_update_attempts: boolean;
  can_delete_evidence: boolean;
};
type EventRow = { event_name: string };

describe("skill, activity, attempt, and evidence HTTP lifecycle", () => {
  const migrationPool = createDatabasePool(
    requireEnv("DATABASE_MIGRATION_URL"),
    { applicationName: "learning-loop-http-integration-fixtures" }
  );

  let app: NestFastifyApplication;
  let ownerUserId = "";
  let learnerUserId = "";
  let instructorUserId = "";
  let organizationId = "";
  let courseId = "";
  let versionOneId = "";
  let versionTwoId = "";
  let primarySkillId = "";
  let unrelatedSkillId = "";
  let activityId = "";
  let activityVersionOneId = "";
  let activityVersionTwoId = "";
  let offeringId = "";
  let enrollmentId = "";
  let firstAttemptId = "";
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
      throw new Error("Failed to create learning-loop test identity.");
    }
    createdUserIds.push(id);
    return id;
  }

  async function activateMember(
    userId: string,
    roleKey: "learner" | "instructor"
  ) {
    const invite = await app.inject({
      method: "POST",
      url: `/v1/organizations/${organizationId}/memberships`,
      headers: { "x-test-user-id": ownerUserId },
      payload: { userId }
    });
    if (invite.statusCode !== 201) {
      throw new Error(`Failed to invite ${roleKey}: ${invite.body}`);
    }

    const accept = await app.inject({
      method: "POST",
      url: `/v1/organizations/${organizationId}/memberships/me/accept`,
      headers: { "x-test-user-id": userId }
    });
    if (accept.statusCode !== 200) {
      throw new Error(`Failed to activate ${roleKey}: ${accept.body}`);
    }

    const role = await app.inject({
      method: "POST",
      url: `/v1/organizations/${organizationId}/role-assignments`,
      headers: { "x-test-user-id": ownerUserId },
      payload: {
        userId,
        roleKey,
        scope: { type: "organization", id: organizationId }
      }
    });
    if (role.statusCode !== 204) {
      throw new Error(`Failed to assign ${roleKey}: ${role.body}`);
    }
  }

  beforeAll(async () => {
    ownerUserId = await createUser("loop-owner");
    learnerUserId = await createUser("loop-learner");
    instructorUserId = await createUser("loop-instructor");

    app = await createApiApplication();
    app
      .getHttpAdapter()
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

    organizationId = (
      await createTestOrganization(migrationPool, ownerUserId, {
        slug: `loop-${randomUUID()}`,
        name: "Learning loop integration"
      })
    ).id;

    await activateMember(learnerUserId, "learner");
    await activateMember(instructorUserId, "instructor");
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
        `DELETE FROM learning_content.skills WHERE organization_id = $1`,
        [organizationId]
      );
      await migrationPool.query(
        `DELETE FROM learning_content.courses WHERE organization_id = $1`,
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

  it("keeps skill catalog mutation away from learners", async () => {
    const response = await app.inject({
      method: "POST",
      url: `/v1/organizations/${organizationId}/skills`,
      headers: { "x-test-user-id": learnerUserId },
      payload: { key: `forbidden-${randomUUID()}`, title: "Forbidden skill" }
    });
    expect(response.statusCode).toBe(403);
  });

  it("creates stable skills independently from course versions", async () => {
    const primary = await app.inject({
      method: "POST",
      url: `/v1/organizations/${organizationId}/skills`,
      headers: { "x-test-user-id": ownerUserId },
      payload: {
        key: `css-grid-${randomUUID()}`,
        title: "CSS Grid",
        description: "Build two-dimensional layouts"
      }
    });
    expect(primary.statusCode).toBe(201);
    primarySkillId = (JSON.parse(primary.body) as { id: string }).id;

    const unrelated = await app.inject({
      method: "POST",
      url: `/v1/organizations/${organizationId}/skills`,
      headers: { "x-test-user-id": ownerUserId },
      payload: {
        key: `sql-joins-${randomUUID()}`,
        title: "SQL joins"
      }
    });
    expect(unrelated.statusCode).toBe(201);
    unrelatedSkillId = (JSON.parse(unrelated.body) as { id: string }).id;
  });

  it("builds a draft learning graph from skill snapshots and package-extensible activities", async () => {
    const course = await app.inject({
      method: "POST",
      url: `/v1/organizations/${organizationId}/courses`,
      headers: { "x-test-user-id": ownerUserId },
      payload: {
        slug: `loop-course-${randomUUID()}`,
        title: "Frontend practice"
      }
    });
    expect(course.statusCode).toBe(201);
    const created = JSON.parse(course.body) as {
      course: { id: string };
      draftVersion: { id: string };
    };
    courseId = created.course.id;
    versionOneId = created.draftVersion.id;

    const attach = await app.inject({
      method: "POST",
      url: `/v1/organizations/${organizationId}/courses/${courseId}/versions/${versionOneId}/skills`,
      headers: { "x-test-user-id": ownerUserId },
      payload: { skillId: primarySkillId, position: 0 }
    });
    expect(attach.statusCode).toBe(201);
    expect(JSON.parse(attach.body)).toMatchObject({
      skillId: primarySkillId,
      title: "CSS Grid",
      position: 0
    });

    const activity = await app.inject({
      method: "POST",
      url: `/v1/organizations/${organizationId}/courses/${courseId}/versions/${versionOneId}/activities`,
      headers: { "x-test-user-id": ownerUserId },
      payload: {
        slug: "responsive-dashboard",
        activityType: "pern.code-project",
        title: "Build a responsive dashboard",
        instructions: "Use CSS Grid for the main layout.",
        config: { starter: "dashboard" },
        skillIds: [primarySkillId]
      }
    });
    expect(activity.statusCode).toBe(201);
    const body = JSON.parse(activity.body) as {
      id: string;
      activityId: string;
      activityType: string;
      skillIds: string[];
    };
    activityVersionOneId = body.id;
    activityId = body.activityId;
    expect(body.activityType).toBe("pern.code-project");
    expect(body.skillIds).toEqual([primarySkillId]);
  });

  it("freezes the exact graph when the course version is published", async () => {
    const publish = await app.inject({
      method: "POST",
      url: `/v1/organizations/${organizationId}/courses/${courseId}/versions/${versionOneId}/publish`,
      headers: { "x-test-user-id": ownerUserId }
    });
    expect(publish.statusCode).toBe(200);

    const apiMutation = await app.inject({
      method: "POST",
      url: `/v1/organizations/${organizationId}/courses/${courseId}/versions/${versionOneId}/skills`,
      headers: { "x-test-user-id": ownerUserId },
      payload: { skillId: unrelatedSkillId }
    });
    expect(apiMutation.statusCode).toBe(409);

    await expect(
      migrationPool.query(
        `INSERT INTO learning_content.course_version_skills
           (organization_id, course_version_id, skill_id, title, description)
         SELECT $1, $2, id, canonical_title, canonical_description
           FROM learning_content.skills
          WHERE id = $3`,
        [organizationId, versionOneId, unrelatedSkillId]
      )
    ).rejects.toMatchObject({ code: "55000" });
  });

  it("clones stable skill and activity identities into a new editable course-version snapshot", async () => {
    const nextVersion = await app.inject({
      method: "POST",
      url: `/v1/organizations/${organizationId}/courses/${courseId}/versions`,
      headers: { "x-test-user-id": ownerUserId },
      payload: { title: "Frontend practice v2" }
    });
    expect(nextVersion.statusCode).toBe(201);
    versionTwoId = (JSON.parse(nextVersion.body) as { id: string }).id;

    const cloned = await migrationPool.query<ActivityVersionRow>(
      `SELECT id::text, activity_id::text
         FROM learning_content.course_version_activities
        WHERE organization_id = $1
          AND course_version_id = $2
          AND activity_id = $3`,
      [organizationId, versionTwoId, activityId]
    );
    const row = cloned.rows[0];
    expect(row).toBeDefined();
    activityVersionTwoId = row?.id ?? "";
    expect(row?.activity_id).toBe(activityId);
    expect(activityVersionTwoId).not.toBe(activityVersionOneId);

    const skillClone = await migrationPool.query<IdRow>(
      `SELECT skill_id::text AS id
         FROM learning_content.course_version_skills
        WHERE organization_id = $1
          AND course_version_id = $2
          AND skill_id = $3`,
      [organizationId, versionTwoId, primarySkillId]
    );
    expect(skillClone.rows[0]?.id).toBe(primarySkillId);
  });

  it("creates delivery from published v1 and enrolls the learner", async () => {
    const offering = await app.inject({
      method: "POST",
      url: `/v1/organizations/${organizationId}/offerings`,
      headers: { "x-test-user-id": ownerUserId },
      payload: {
        courseVersionId: versionOneId,
        slug: `loop-offering-${randomUUID()}`,
        name: "Learning loop self-paced",
        deliveryMode: "self_paced"
      }
    });
    expect(offering.statusCode).toBe(201);
    offeringId = (JSON.parse(offering.body) as { id: string }).id;

    const enrollment = await app.inject({
      method: "POST",
      url: `/v1/organizations/${organizationId}/offerings/${offeringId}/enrollments`,
      headers: { "x-test-user-id": ownerUserId },
      payload: { userId: learnerUserId }
    });
    expect(enrollment.statusCode).toBe(201);
    enrollmentId = (JSON.parse(enrollment.body) as { id: string }).id;
  });

  it("models retry as a new immutable Attempt against the exact activity snapshot", async () => {
    const first = await startAndSubmitAttempt(app, {
      url: `/v1/organizations/${organizationId}/enrollments/${enrollmentId}/activities/${activityId}/attempts`,
      headers: { "x-test-user-id": learnerUserId },
      submission: { repository: "attempt-one" }
    });
    expect(first.statusCode).toBe(201);
    const firstBody = JSON.parse(first.body) as {
      id: string;
      activityVersionId: string;
      attemptNumber: number;
    };
    firstAttemptId = firstBody.id;
    expect(firstBody.activityVersionId).toBe(activityVersionOneId);
    expect(firstBody.attemptNumber).toBe(1);

    const retry = await startAndSubmitAttempt(app, {
      url: `/v1/organizations/${organizationId}/enrollments/${enrollmentId}/activities/${activityId}/attempts`,
      headers: { "x-test-user-id": learnerUserId },
      submission: { repository: "attempt-two" }
    });
    expect(retry.statusCode).toBe(201);
    const retryBody = JSON.parse(retry.body) as {
      id: string;
      attemptNumber: number;
    };
    expect(retryBody.id).not.toBe(firstAttemptId);
    expect(retryBody.attemptNumber).toBe(2);

    const impersonation = await startAndSubmitAttempt(app, {
      url: `/v1/organizations/${organizationId}/enrollments/${enrollmentId}/activities/${activityId}/attempts`,
      headers: { "x-test-user-id": instructorUserId },
      submission: {}
    });
    expect(impersonation.statusCode).toBe(403);
  });

  it("rejects an Attempt that mixes an enrollment from v1 with an Activity snapshot from v2", async () => {
    await expect(
      migrationPool.query(
        `INSERT INTO learning_progress.attempts
           (organization_id, enrollment_id, activity_version_id, attempt_number, submission)
         VALUES ($1, $2, $3, 99, '{}'::jsonb)`,
        [organizationId, enrollmentId, activityVersionTwoId]
      )
    ).rejects.toMatchObject({ code: "23514" });
  });

  it("lets an instructor record Evidence only for a Skill assessed by the Attempt activity", async () => {
    const learnerEvidence = await app.inject({
      method: "POST",
      url: evidenceUrlForAttempt(organizationId, firstAttemptId),
      headers: { "x-test-user-id": learnerUserId },
      payload: {
        skillId: primarySkillId,
        kind: "manual-review",
        score: 0.9
      }
    });
    expect(learnerEvidence.statusCode).toBe(403);

    const unrelated = await app.inject({
      method: "POST",
      url: evidenceUrlForAttempt(organizationId, firstAttemptId),
      headers: { "x-test-user-id": instructorUserId },
      payload: {
        skillId: unrelatedSkillId,
        kind: "manual-review",
        score: 0.9
      }
    });
    expect(unrelated.statusCode).toBe(400);

    const valid = await app.inject({
      method: "POST",
      url: evidenceUrlForAttempt(organizationId, firstAttemptId),
      headers: { "x-test-user-id": instructorUserId },
      payload: {
        skillId: primarySkillId,
        kind: "manual-review",
        score: 0.9,
        payload: { rubric: "passed" }
      }
    });
    expect(valid.statusCode).toBe(201);
    expect(JSON.parse(valid.body)).toMatchObject({
      attemptId: firstAttemptId,
      skillId: primarySkillId,
      kind: "manual-review",
      score: 0.9,
      recordedByUserId: instructorUserId
    });

    await expect(
      migrationPool.query(
        `INSERT INTO learning_progress.evidence
           (organization_id, attempt_id, skill_id, kind, score, recorded_by_user_id)
         VALUES ($1, $2, $3, 'manual-review', 0.5, $4)`,
        [organizationId, firstAttemptId, unrelatedSkillId, instructorUserId]
      )
    ).rejects.toMatchObject({ code: "23514" });
  });

  it("keeps Attempts and Evidence append-only for the application database role", async () => {
    const result = await migrationPool.query<PrivilegeRow>(
      `SELECT has_table_privilege('platform_app', 'learning_progress.attempts', 'UPDATE') AS can_update_attempts,
              has_table_privilege('platform_app', 'learning_progress.evidence', 'DELETE') AS can_delete_evidence`
    );
    expect(result.rows[0]).toEqual({
      can_update_attempts: false,
      can_delete_evidence: false
    });
  });

  it("records the learning loop mutations in the transactional outbox", async () => {
    const result = await migrationPool.query<EventRow>(
      `SELECT event_name
         FROM events.outbox
        WHERE organization_id = $1
          AND event_name IN (
            'skill.created',
            'course_version.skill_attached',
            'activity.created',
            'submission.submitted',
            'evidence.recorded'
          )`,
      [organizationId]
    );
    const names = result.rows.map((row) => row.event_name);
    expect(names.filter((name) => name === "skill.created")).toHaveLength(2);
    expect(names).toContain("course_version.skill_attached");
    expect(names).toContain("activity.created");
    expect(
      names.filter((name) => name === "submission.submitted")
    ).toHaveLength(2);
    // The pre-F4 alias is no longer emitted (ADR-0018 compatibility window closed).
    expect(names).not.toContain("attempt.submitted");
    expect(names).toContain("evidence.recorded");
  });
});
