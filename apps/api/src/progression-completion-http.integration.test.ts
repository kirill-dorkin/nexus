import { randomUUID } from "node:crypto";

import type { NestFastifyApplication } from "@nestjs/platform-fastify";
import { enrollmentSchema } from "@platform/contracts";
import { createDatabasePool } from "@platform/database";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createTestOrganization } from "./test-support/create-test-organization";
import { createApiApplication } from "./app.factory";
import {
  attachPlatformPrincipal,
  type PlatformPrincipalCarrier
} from "./request-context/platform-principal";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (value === undefined || value.trim().length === 0) {
    throw new Error(
      `${name} is required for progression completion integration tests.`
    );
  }
  return value;
}

type IdRow = { id: string };
type CountRow = { count: string };
type CompletionEventRow = {
  actor_user_id: string;
  payload: {
    organizationId: string;
    enrollmentId: string;
    offeringId: string;
    userId: string;
    completedAt: string;
  };
};

describe("readiness-gated enrollment completion HTTP lifecycle", () => {
  const migrationPool = createDatabasePool(
    requireEnv("DATABASE_MIGRATION_URL"),
    { applicationName: "progression-completion-integration-fixtures" }
  );

  let app: NestFastifyApplication;
  let ownerUserId = "";
  let learnerUserId = "";
  let organizationId = "";
  let courseId = "";
  let courseVersionId = "";
  let skillId = "";
  let activityId = "";
  let offeringId = "";
  let enrollmentId = "";
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
      throw new Error("Failed to create progression-completion identity.");
    }
    createdUserIds.push(id);
    return id;
  }

  async function activateLearner(userId: string): Promise<void> {
    const invite = await app.inject({
      method: "POST",
      url: `/v1/organizations/${organizationId}/memberships`,
      headers: { "x-test-user-id": ownerUserId },
      payload: { userId }
    });
    expect(invite.statusCode).toBe(201);

    const accept = await app.inject({
      method: "POST",
      url: `/v1/organizations/${organizationId}/memberships/me/accept`,
      headers: { "x-test-user-id": userId }
    });
    expect(accept.statusCode).toBe(200);

    const role = await app.inject({
      method: "POST",
      url: `/v1/organizations/${organizationId}/role-assignments`,
      headers: { "x-test-user-id": ownerUserId },
      payload: {
        userId,
        roleKey: "learner",
        scope: { type: "organization", id: organizationId }
      }
    });
    expect(role.statusCode).toBe(204);
  }

  async function createScoredAttempt(
    score: number,
    sequence: number
  ): Promise<void> {
    const attempt = await app.inject({
      method: "POST",
      url: `/v1/organizations/${organizationId}/enrollments/${enrollmentId}/activities/${activityId}/attempts`,
      headers: { "x-test-user-id": learnerUserId },
      payload: {
        submission: {
          source: `completion-${sequence}`
        }
      }
    });
    expect(attempt.statusCode).toBe(201);
    const attemptId = (JSON.parse(attempt.body) as { id: string }).id;

    const evidence = await app.inject({
      method: "POST",
      url: `/v1/organizations/${organizationId}/attempts/${attemptId}/evidence`,
      headers: { "x-test-user-id": ownerUserId },
      payload: {
        skillId,
        kind: "manual-review",
        score
      }
    });
    expect(evidence.statusCode).toBe(201);
  }

  async function complete(userId: string) {
    return app.inject({
      method: "POST",
      url: `/v1/organizations/${organizationId}/enrollments/${enrollmentId}/complete`,
      headers: { "x-test-user-id": userId }
    });
  }

  async function completionEventCount(): Promise<number> {
    const result = await migrationPool.query<CountRow>(
      `SELECT count(*)::text AS count
         FROM events.outbox
        WHERE organization_id = $1
          AND event_name = 'enrollment.completed'
          AND aggregate_id = $2`,
      [organizationId, enrollmentId]
    );
    return Number(result.rows[0]?.count ?? "0");
  }

  beforeAll(async () => {
    ownerUserId = await createUser("progression-owner");
    learnerUserId = await createUser("progression-learner");

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

    organizationId = (await createTestOrganization(migrationPool, ownerUserId, {
        slug: `progression-${randomUUID()}`,
        name: "Progression completion integration"
      })).id;

    await activateLearner(learnerUserId);

    const skill = await app.inject({
      method: "POST",
      url: `/v1/organizations/${organizationId}/skills`,
      headers: { "x-test-user-id": ownerUserId },
      payload: {
        key: `progression-skill-${randomUUID()}`,
        title: "Complete a readiness-gated course"
      }
    });
    expect(skill.statusCode).toBe(201);
    skillId = (JSON.parse(skill.body) as { id: string }).id;

    const course = await app.inject({
      method: "POST",
      url: `/v1/organizations/${organizationId}/courses`,
      headers: { "x-test-user-id": ownerUserId },
      payload: {
        slug: `progression-course-${randomUUID()}`,
        title: "Readiness-gated completion"
      }
    });
    expect(course.statusCode).toBe(201);
    const createdCourse = JSON.parse(course.body) as {
      course: { id: string };
      draftVersion: { id: string };
    };
    courseId = createdCourse.course.id;
    courseVersionId = createdCourse.draftVersion.id;

    const attached = await app.inject({
      method: "POST",
      url: `/v1/organizations/${organizationId}/courses/${courseId}/versions/${courseVersionId}/skills`,
      headers: { "x-test-user-id": ownerUserId },
      payload: { skillId, position: 0 }
    });
    expect(attached.statusCode).toBe(201);

    const activity = await app.inject({
      method: "POST",
      url: `/v1/organizations/${organizationId}/courses/${courseId}/versions/${courseVersionId}/activities`,
      headers: { "x-test-user-id": ownerUserId },
      payload: {
        slug: "progression-practice",
        activityType: "pern.code-project",
        title: "Practice readiness-gated completion",
        position: 0,
        skillIds: [skillId],
        config: {
          validation: {
            validatorKey: "manual-review",
            validatorVersion: 1,
            config: {}
          }
        }
      }
    });
    expect(activity.statusCode).toBe(201);
    activityId = (JSON.parse(activity.body) as { activityId: string }).activityId;

    const published = await app.inject({
      method: "POST",
      url: `/v1/organizations/${organizationId}/courses/${courseId}/versions/${courseVersionId}/publish`,
      headers: { "x-test-user-id": ownerUserId }
    });
    expect(published.statusCode).toBe(200);

    const offering = await app.inject({
      method: "POST",
      url: `/v1/organizations/${organizationId}/offerings`,
      headers: { "x-test-user-id": ownerUserId },
      payload: {
        courseVersionId,
        slug: `progression-offering-${randomUUID()}`,
        name: "Readiness-gated self-paced offering",
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
        `DELETE FROM learning_progress.mastery_projections WHERE organization_id = $1`,
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

  it("keeps authorization separate and fails closed on insufficient evidence", async () => {
    const otherActor = await complete(ownerUserId);
    expect(otherActor.statusCode).toBe(403);

    const blocked = await complete(learnerUserId);
    expect(blocked.statusCode).toBe(409);
    expect(JSON.parse(blocked.body)).toMatchObject({
      code: "progression_gate_denied",
      gatePolicy: {
        key: "course-readiness-enrollment-completion",
        version: 1
      },
      readiness: {
        status: "insufficient_evidence",
        enrollmentId,
        offeringId,
        courseVersionId
      }
    });
    expect(await completionEventCount()).toBe(0);
  });

  it("keeps definitive not-ready state blocked", async () => {
    await createScoredAttempt(0, 1);
    await createScoredAttempt(0, 2);

    const blocked = await complete(learnerUserId);
    expect(blocked.statusCode).toBe(409);
    expect(JSON.parse(blocked.body)).toMatchObject({
      code: "progression_gate_denied",
      readiness: {
        status: "not_ready",
        skills: [
          {
            skillId,
            status: "not_ready",
            masteryScore: 0,
            scoredAttemptCount: 2
          }
        ]
      }
    });
    expect(await completionEventCount()).toBe(0);
  });

  it("completes only after readiness is ready and keeps retry idempotent", async () => {
    for (let sequence = 3; sequence <= 10; sequence += 1) {
      await createScoredAttempt(1, sequence);
    }

    const completed = await complete(learnerUserId);
    expect(completed.statusCode).toBe(200);
    const enrollment = enrollmentSchema.parse(JSON.parse(completed.body));
    expect(enrollment).toMatchObject({
      id: enrollmentId,
      organizationId,
      offeringId,
      userId: learnerUserId,
      status: "completed"
    });
    expect(enrollment.completedAt).not.toBeNull();
    expect(await completionEventCount()).toBe(1);

    const event = await migrationPool.query<CompletionEventRow>(
      `SELECT actor_user_id::text, payload
         FROM events.outbox
        WHERE organization_id = $1
          AND event_name = 'enrollment.completed'
          AND aggregate_id = $2`,
      [organizationId, enrollmentId]
    );
    expect(event.rows[0]).toMatchObject({
      actor_user_id: learnerUserId,
      payload: {
        organizationId,
        enrollmentId,
        offeringId,
        userId: learnerUserId,
        completedAt: enrollment.completedAt
      }
    });

    const retry = await complete(learnerUserId);
    expect(retry.statusCode).toBe(200);
    const retried = enrollmentSchema.parse(JSON.parse(retry.body));
    expect(retried.completedAt).toBe(enrollment.completedAt);
    expect(await completionEventCount()).toBe(1);

    await expect(
      migrationPool.query(
        `UPDATE learning_delivery.enrollments
            SET status = 'active',
                completed_at = NULL
          WHERE organization_id = $1
            AND id = $2`,
        [organizationId, enrollmentId]
      )
    ).rejects.toMatchObject({ code: "55000" });

    const attemptAfterCompletion = await app.inject({
      method: "POST",
      url: `/v1/organizations/${organizationId}/enrollments/${enrollmentId}/activities/${activityId}/attempts`,
      headers: { "x-test-user-id": learnerUserId },
      payload: { submission: { source: "after-completion" } }
    });
    expect(attemptAfterCompletion.statusCode).toBe(409);

    const readinessAfterCompletion = await app.inject({
      method: "GET",
      url: `/v1/organizations/${organizationId}/enrollments/${enrollmentId}/readiness`,
      headers: { "x-test-user-id": learnerUserId }
    });
    expect(readinessAfterCompletion.statusCode).toBe(409);
  });
});
