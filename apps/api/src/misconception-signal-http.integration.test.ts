import { randomUUID } from "node:crypto";

import type { NestFastifyApplication } from "@nestjs/platform-fastify";
import { nextLearningRecommendationSchema } from "@platform/contracts";
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
    throw new Error(`${name} is required for misconception signal integration tests.`);
  }
  return value;
}

type IdRow = { id: string };

describe("trusted misconception signal HTTP lifecycle", () => {
  const migrationPool = createDatabasePool(
    requireEnv("DATABASE_MIGRATION_URL"),
    { applicationName: "misconception-signal-http-integration-fixtures" }
  );

  let app: NestFastifyApplication;
  let ownerUserId = "";
  let learnerUserId = "";
  let organizationId = "";
  let courseId = "";
  let courseVersionId = "";
  let skillId = "";
  let activityId = "";
  let activityVersionId = "";
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
      throw new Error("Failed to create misconception-signal test identity.");
    }
    createdUserIds.push(id);
    return id;
  }

  async function createFailedOrPassedAttempt(
    outcome: "passed" | "failed",
    sequence: number
  ): Promise<void> {
    const attempt = await app.inject({
      method: "POST",
      url: `/v1/organizations/${organizationId}/enrollments/${enrollmentId}/activities/${activityId}/attempts`,
      headers: { "x-test-user-id": learnerUserId },
      payload: {
        submission: { source: `attempt-${sequence}` }
      }
    });
    expect(attempt.statusCode).toBe(201);
    const attemptId = (JSON.parse(attempt.body) as { id: string }).id;

    const submission = await migrationPool.query<IdRow>(
      `SELECT id::text
         FROM learning_progress.submissions
        WHERE organization_id = $1
          AND attempt_id = $2`,
      [organizationId, attemptId]
    );
    const submissionId = submission.rows[0]?.id;
    if (submissionId === undefined) {
      throw new Error("Attempt compatibility submission was not persisted.");
    }

    const validation = await app.inject({
      method: "POST",
      url: `/v1/organizations/${organizationId}/submissions/${submissionId}/validation-results`,
      headers: { "x-test-user-id": ownerUserId },
      payload: {
        idempotencyKey: `misconception-${sequence}-${outcome}`,
        status: "completed",
        outcome,
        score: outcome === "passed" ? 1 : 0,
        payload: { diagnosticDetail: "must-not-become-a-misconception-input" }
      }
    });
    expect(validation.statusCode).toBe(201);
  }

  beforeAll(async () => {
    ownerUserId = await createUser("misconception-owner");
    learnerUserId = await createUser("misconception-learner");

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

    const organization = await app.inject({
      method: "POST",
      url: "/v1/organizations",
      headers: { "x-test-user-id": ownerUserId },
      payload: {
        slug: `misconception-${randomUUID()}`,
        name: "Misconception signal integration"
      }
    });
    expect(organization.statusCode).toBe(201);
    organizationId = (JSON.parse(organization.body) as { id: string }).id;

    const invite = await app.inject({
      method: "POST",
      url: `/v1/organizations/${organizationId}/memberships`,
      headers: { "x-test-user-id": ownerUserId },
      payload: { userId: learnerUserId }
    });
    expect(invite.statusCode).toBe(201);

    const accept = await app.inject({
      method: "POST",
      url: `/v1/organizations/${organizationId}/memberships/me/accept`,
      headers: { "x-test-user-id": learnerUserId }
    });
    expect(accept.statusCode).toBe(200);

    const role = await app.inject({
      method: "POST",
      url: `/v1/organizations/${organizationId}/role-assignments`,
      headers: { "x-test-user-id": ownerUserId },
      payload: {
        userId: learnerUserId,
        roleKey: "learner",
        scope: { type: "organization", id: organizationId }
      }
    });
    expect(role.statusCode).toBe(204);

    const skill = await app.inject({
      method: "POST",
      url: `/v1/organizations/${organizationId}/skills`,
      headers: { "x-test-user-id": ownerUserId },
      payload: {
        key: `misconception-skill-${randomUUID()}`,
        title: "Deterministic state transitions"
      }
    });
    expect(skill.statusCode).toBe(201);
    skillId = (JSON.parse(skill.body) as { id: string }).id;

    const course = await app.inject({
      method: "POST",
      url: `/v1/organizations/${organizationId}/courses`,
      headers: { "x-test-user-id": ownerUserId },
      payload: {
        slug: `misconception-course-${randomUUID()}`,
        title: "Trusted misconception signal course"
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
        slug: "state-transition-practice",
        activityType: "pern.code-project",
        title: "Practice deterministic state transitions",
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
    const activityBody = JSON.parse(activity.body) as {
      id: string;
      activityId: string;
    };
    activityVersionId = activityBody.id;
    activityId = activityBody.activityId;

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
        slug: `misconception-offering-${randomUUID()}`,
        name: "Trusted misconception signal offering",
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
        `DELETE FROM learning_validation.validation_results WHERE organization_id = $1`,
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

  it("starts without a misconception signal while exposing the versioned policy", async () => {
    const response = await app.inject({
      method: "GET",
      url: `/v1/organizations/${organizationId}/enrollments/${enrollmentId}/recommendation`,
      headers: { "x-test-user-id": learnerUserId }
    });
    expect(response.statusCode).toBe(200);

    const body = nextLearningRecommendationSchema.parse(JSON.parse(response.body));
    expect(body).toMatchObject({
      status: "recommended",
      misconceptionSignalPolicy: {
        key: "repeated-trusted-failure",
        version: 1,
        minimumConsecutiveFailures: 2
      },
      recommendation: {
        activity: {
          activityVersionId,
          activityId
        },
        focusSkill: { skillId },
        misconceptionSignal: null
      }
    });
  });

  it("surfaces repeated trusted failures without changing the selected activity", async () => {
    await createFailedOrPassedAttempt("failed", 1);
    await createFailedOrPassedAttempt("failed", 2);

    const response = await app.inject({
      method: "GET",
      url: `/v1/organizations/${organizationId}/enrollments/${enrollmentId}/recommendation`,
      headers: { "x-test-user-id": learnerUserId }
    });
    expect(response.statusCode).toBe(200);

    const body = nextLearningRecommendationSchema.parse(JSON.parse(response.body));
    expect(body.status).toBe("recommended");
    if (body.status !== "recommended") {
      throw new Error("Expected the below-target skill to remain recommended.");
    }

    expect(body.recommendation).toMatchObject({
      activity: {
        activityVersionId,
        activityId
      },
      focusSkill: {
        skillId,
        masteryScore: 0
      },
      reason: {
        code: "focus_skill_below_target",
        attemptCount: 2
      },
      misconceptionSignal: {
        status: "suspected",
        code: "repeated_trusted_failure",
        skillId,
        consecutiveFailureCount: 2
      }
    });
  });

  it("clears the active signal after a later trusted pass", async () => {
    await createFailedOrPassedAttempt("passed", 3);

    const response = await app.inject({
      method: "GET",
      url: `/v1/organizations/${organizationId}/enrollments/${enrollmentId}/recommendation`,
      headers: { "x-test-user-id": learnerUserId }
    });
    expect(response.statusCode).toBe(200);

    const body = nextLearningRecommendationSchema.parse(JSON.parse(response.body));
    expect(body.status).toBe("recommended");
    if (body.status !== "recommended") {
      throw new Error("Expected the skill to remain below target after one later pass.");
    }

    expect(body.recommendation.activity).toMatchObject({
      activityVersionId,
      activityId
    });
    expect(body.recommendation.misconceptionSignal).toBeNull();
  });
});
