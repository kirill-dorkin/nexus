import { randomUUID } from "node:crypto";

import type { NestFastifyApplication } from "@nestjs/platform-fastify";
import { courseReadinessDecisionSchema } from "@platform/contracts";
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
      `${name} is required for course readiness integration tests.`
    );
  }
  return value;
}

type IdRow = { id: string };

describe("course readiness HTTP lifecycle", () => {
  const migrationPool = createDatabasePool(
    requireEnv("DATABASE_MIGRATION_URL"),
    { applicationName: "course-readiness-http-integration-fixtures" }
  );

  let app: NestFastifyApplication;
  let ownerUserId = "";
  let learnerUserId = "";
  let otherLearnerUserId = "";
  let instructorUserId = "";
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
      throw new Error("Failed to create course-readiness test identity.");
    }
    createdUserIds.push(id);
    return id;
  }

  async function activateMember(
    userId: string,
    roleKey: "learner" | "instructor"
  ): Promise<void> {
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
        roleKey,
        scope: { type: "organization", id: organizationId }
      }
    });
    expect(role.statusCode).toBe(204);
  }

  async function createManualPass(sequence: number): Promise<void> {
    const attempt = await app.inject({
      method: "POST",
      url: `/v1/organizations/${organizationId}/enrollments/${enrollmentId}/activities/${activityId}/attempts`,
      headers: { "x-test-user-id": learnerUserId },
      payload: { submission: { source: `manual-pass-${sequence}` } }
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
        score: 1
      }
    });
    expect(evidence.statusCode).toBe(201);
  }

  async function createTrustedOutcome(
    outcome: "passed" | "failed",
    sequence: number
  ): Promise<void> {
    const attempt = await app.inject({
      method: "POST",
      url: `/v1/organizations/${organizationId}/enrollments/${enrollmentId}/activities/${activityId}/attempts`,
      headers: { "x-test-user-id": learnerUserId },
      payload: { submission: { source: `trusted-${sequence}` } }
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
        idempotencyKey: `readiness-${sequence}-${outcome}`,
        status: "completed",
        outcome,
        score: outcome === "passed" ? 1 : 0,
        payload: { diagnosticDetail: "must-not-become-a-readiness-input" }
      }
    });
    expect(validation.statusCode).toBe(201);
  }

  async function readReadiness(userId = learnerUserId) {
    const response = await app.inject({
      method: "GET",
      url: `/v1/organizations/${organizationId}/enrollments/${enrollmentId}/readiness`,
      headers: { "x-test-user-id": userId }
    });
    return {
      response,
      body:
        response.statusCode === 200
          ? courseReadinessDecisionSchema.parse(JSON.parse(response.body))
          : null
    };
  }

  beforeAll(async () => {
    ownerUserId = await createUser("readiness-owner");
    learnerUserId = await createUser("readiness-learner");
    otherLearnerUserId = await createUser("readiness-other-learner");
    instructorUserId = await createUser("readiness-instructor");

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
        slug: `readiness-${randomUUID()}`,
        name: "Course readiness integration"
      })
    ).id;

    await activateMember(learnerUserId, "learner");
    await activateMember(otherLearnerUserId, "learner");
    await activateMember(instructorUserId, "instructor");

    const skill = await app.inject({
      method: "POST",
      url: `/v1/organizations/${organizationId}/skills`,
      headers: { "x-test-user-id": ownerUserId },
      payload: {
        key: `readiness-skill-${randomUUID()}`,
        title: "Reliable state transitions"
      }
    });
    expect(skill.statusCode).toBe(201);
    skillId = (JSON.parse(skill.body) as { id: string }).id;

    const course = await app.inject({
      method: "POST",
      url: `/v1/organizations/${organizationId}/courses`,
      headers: { "x-test-user-id": ownerUserId },
      payload: {
        slug: `readiness-course-${randomUUID()}`,
        title: "Course progression readiness"
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
        slug: "readiness-practice",
        activityType: "pern.code-project",
        title: "Practice reliable state transitions",
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
    activityId = (JSON.parse(activity.body) as { activityId: string })
      .activityId;

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
        slug: `readiness-offering-${randomUUID()}`,
        name: "Course readiness self-paced offering",
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

  it("returns explicit insufficient evidence before two distinct scored Attempts", async () => {
    const initial = await readReadiness();
    expect(initial.response.statusCode).toBe(200);
    expect(initial.body).toMatchObject({
      status: "insufficient_evidence",
      policy: {
        key: "course-progression-readiness",
        version: 1,
        minimumScoredAttemptsPerSkill: 2
      },
      skills: [
        {
          skillId,
          status: "insufficient_evidence",
          scoredAttemptCount: 0
        }
      ]
    });

    await createManualPass(1);
    const onePass = await readReadiness();
    expect(onePass.body).toMatchObject({
      status: "insufficient_evidence",
      skills: [
        {
          skillId,
          masteryScore: 1,
          scoredAttemptCount: 1,
          reasons: [
            {
              code: "insufficient_scored_attempts",
              observedScoredAttemptCount: 1,
              requiredScoredAttemptCount: 2
            }
          ]
        }
      ]
    });
  });

  it("becomes ready after two distinct fresh scored Attempts without completing Enrollment", async () => {
    await createManualPass(2);

    const ready = await readReadiness();
    expect(ready.response.statusCode).toBe(200);
    expect(ready.body).toMatchObject({
      status: "ready",
      enrollmentId,
      offeringId,
      courseVersionId,
      policy: {
        masteryAlgorithm: {
          key: "mean-scored-evidence",
          version: 1
        },
        masteryTarget: 0.8,
        evidenceFreshnessDays: 7
      },
      skills: [
        {
          skillId,
          status: "ready",
          masteryScore: 1,
          scoredAttemptCount: 2,
          reasons: []
        }
      ]
    });
    expect(ready.body?.readyUntil).not.toBeNull();

    const enrollment = await migrationPool.query<{ status: string }>(
      `SELECT status
         FROM learning_delivery.enrollments
        WHERE organization_id = $1
          AND id = $2`,
      [organizationId, enrollmentId]
    );
    expect(enrollment.rows[0]?.status).toBe("active");
  });

  it("keeps self-read separate from other-learner readiness visibility", async () => {
    const forbidden = await readReadiness(otherLearnerUserId);
    expect(forbidden.response.statusCode).toBe(403);

    const instructor = await readReadiness(instructorUserId);
    expect(instructor.response.statusCode).toBe(200);
    expect(instructor.body?.status).toBe("ready");
  });

  it("blocks readiness on repeated trusted failure even while Mastery remains at target", async () => {
    for (let sequence = 3; sequence <= 8; sequence += 1) {
      await createManualPass(sequence);
    }
    await createTrustedOutcome("failed", 9);
    await createTrustedOutcome("failed", 10);

    const blocked = await readReadiness();
    expect(blocked.response.statusCode).toBe(200);
    expect(blocked.body).toMatchObject({
      status: "not_ready",
      skills: [
        {
          skillId,
          status: "not_ready",
          masteryScore: 0.8,
          scoredAttemptCount: 10,
          reasons: [
            {
              code: "active_repeated_trusted_failure",
              consecutiveFailureCount: 2
            }
          ]
        }
      ]
    });
  });

  it("a later trusted pass clears the signal and restores readiness", async () => {
    await createTrustedOutcome("passed", 11);

    const ready = await readReadiness();
    expect(ready.response.statusCode).toBe(200);
    expect(ready.body?.status).toBe("ready");
    expect(ready.body?.skills[0]).toMatchObject({
      skillId,
      status: "ready",
      scoredAttemptCount: 11,
      reasons: []
    });
    expect(ready.body?.skills[0]?.masteryScore).toBeGreaterThan(0.8);
  });
});
