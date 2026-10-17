import { randomUUID } from "node:crypto";

import type { NestFastifyApplication } from "@nestjs/platform-fastify";
import {
  courseReadinessDecisionSchema,
  offeringReadinessOverviewSchema
} from "@platform/contracts";
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
      `${name} is required for offering readiness intelligence integration tests.`
    );
  }
  return value;
}

type IdRow = { id: string };
type CountRow = { count: string };

describe("offering readiness intelligence HTTP lifecycle", () => {
  const migrationPool = createDatabasePool(
    requireEnv("DATABASE_MIGRATION_URL"),
    { applicationName: "offering-readiness-intelligence-integration-fixtures" }
  );

  let app: NestFastifyApplication;
  let ownerUserId = "";
  let readyLearnerUserId = "";
  let insufficientLearnerUserId = "";
  let blockedLearnerUserId = "";
  let completedLearnerUserId = "";
  let instructorUserId = "";
  let mentorUserId = "";
  let organizationId = "";
  let courseId = "";
  let courseVersionId = "";
  let skillId = "";
  let activityId = "";
  let offeringId = "";
  let readyEnrollmentId = "";
  let insufficientEnrollmentId = "";
  let blockedEnrollmentId = "";
  let completedEnrollmentId = "";
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
      throw new Error("Failed to create offering-readiness test identity.");
    }
    createdUserIds.push(id);
    return id;
  }

  async function activateMember(
    userId: string,
    roleKey: "learner" | "instructor" | "mentor"
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

  async function enroll(userId: string): Promise<string> {
    const response = await app.inject({
      method: "POST",
      url: `/v1/organizations/${organizationId}/offerings/${offeringId}/enrollments`,
      headers: { "x-test-user-id": ownerUserId },
      payload: { userId }
    });
    expect(response.statusCode).toBe(201);
    return (JSON.parse(response.body) as { id: string }).id;
  }

  async function addScoredAttempt(
    userId: string,
    enrollmentId: string,
    score: number,
    sequence: number
  ): Promise<void> {
    const attempt = await app.inject({
      method: "POST",
      url: `/v1/organizations/${organizationId}/enrollments/${enrollmentId}/activities/${activityId}/attempts`,
      headers: { "x-test-user-id": userId },
      payload: {
        submission: {
          source: `overview-${userId}-${sequence}`
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

  async function addTrustedOutcome(
    userId: string,
    enrollmentId: string,
    outcome: "passed" | "failed",
    sequence: number
  ): Promise<void> {
    const attempt = await app.inject({
      method: "POST",
      url: `/v1/organizations/${organizationId}/enrollments/${enrollmentId}/activities/${activityId}/attempts`,
      headers: { "x-test-user-id": userId },
      payload: {
        submission: {
          source: `overview-trusted-${userId}-${sequence}`
        }
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
        idempotencyKey: `overview-${sequence}-${outcome}-${userId}`,
        status: "completed",
        outcome,
        score: outcome === "passed" ? 1 : 0,
        payload: {
          diagnosticDetail: "must-not-become-an-aggregation-input"
        }
      }
    });
    expect(validation.statusCode).toBe(201);
  }

  async function readOverview(userId: string) {
    const response = await app.inject({
      method: "GET",
      url: `/v1/organizations/${organizationId}/offerings/${offeringId}/readiness`,
      headers: { "x-test-user-id": userId }
    });
    return {
      response,
      body:
        response.statusCode === 200
          ? offeringReadinessOverviewSchema.parse(JSON.parse(response.body))
          : null
    };
  }

  beforeAll(async () => {
    ownerUserId = await createUser("overview-owner");
    readyLearnerUserId = await createUser("overview-ready");
    insufficientLearnerUserId = await createUser("overview-insufficient");
    blockedLearnerUserId = await createUser("overview-blocked");
    completedLearnerUserId = await createUser("overview-completed");
    instructorUserId = await createUser("overview-instructor");
    mentorUserId = await createUser("overview-mentor");

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
        slug: `overview-${randomUUID()}`,
        name: "Offering readiness intelligence integration"
      })).id;

    await activateMember(readyLearnerUserId, "learner");
    await activateMember(insufficientLearnerUserId, "learner");
    await activateMember(blockedLearnerUserId, "learner");
    await activateMember(completedLearnerUserId, "learner");
    await activateMember(instructorUserId, "instructor");
    await activateMember(mentorUserId, "mentor");

    const skill = await app.inject({
      method: "POST",
      url: `/v1/organizations/${organizationId}/skills`,
      headers: { "x-test-user-id": ownerUserId },
      payload: {
        key: `overview-skill-${randomUUID()}`,
        title: "Explain readiness state"
      }
    });
    expect(skill.statusCode).toBe(201);
    skillId = (JSON.parse(skill.body) as { id: string }).id;

    const course = await app.inject({
      method: "POST",
      url: `/v1/organizations/${organizationId}/courses`,
      headers: { "x-test-user-id": ownerUserId },
      payload: {
        slug: `overview-course-${randomUUID()}`,
        title: "Offering readiness overview"
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
        slug: "overview-practice",
        activityType: "pern.code-project",
        title: "Practice readiness evidence",
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
        slug: `overview-offering-${randomUUID()}`,
        name: "Offering readiness intelligence",
        deliveryMode: "cohort"
      }
    });
    expect(offering.statusCode).toBe(201);
    offeringId = (JSON.parse(offering.body) as { id: string }).id;

    readyEnrollmentId = await enroll(readyLearnerUserId);
    insufficientEnrollmentId = await enroll(insufficientLearnerUserId);
    blockedEnrollmentId = await enroll(blockedLearnerUserId);
    completedEnrollmentId = await enroll(completedLearnerUserId);

    await addScoredAttempt(readyLearnerUserId, readyEnrollmentId, 1, 1);
    await addScoredAttempt(readyLearnerUserId, readyEnrollmentId, 1, 2);
    for (let sequence = 1; sequence <= 8; sequence += 1) {
      await addScoredAttempt(
        blockedLearnerUserId,
        blockedEnrollmentId,
        1,
        sequence
      );
    }
    await addTrustedOutcome(
      blockedLearnerUserId,
      blockedEnrollmentId,
      "failed",
      9
    );
    await addTrustedOutcome(
      blockedLearnerUserId,
      blockedEnrollmentId,
      "failed",
      10
    );

    await migrationPool.query(
      `UPDATE learning_delivery.enrollments
          SET status = 'completed',
              completed_at = now()
        WHERE organization_id = $1
          AND id = $2`,
      [organizationId, completedEnrollmentId]
    );
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

  it("denies learner cohort aggregation while allowing instructor and mentor reads", async () => {
    const learner = await readOverview(readyLearnerUserId);
    expect(learner.response.statusCode).toBe(403);

    const instructor = await readOverview(instructorUserId);
    expect(instructor.response.statusCode).toBe(200);

    const mentor = await readOverview(mentorUserId);
    expect(mentor.response.statusCode).toBe(200);
  });

  it("summarizes only active Enrollments and orders them by deterministic triage", async () => {
    const beforeOutbox = await migrationPool.query<CountRow>(
      `SELECT count(*)::text AS count
         FROM events.outbox
        WHERE organization_id = $1`,
      [organizationId]
    );

    const result = await readOverview(instructorUserId);
    expect(result.response.statusCode).toBe(200);
    expect(result.body).toMatchObject({
      organizationId,
      offeringId,
      courseVersionId,
      policy: {
        key: "course-progression-readiness",
        version: 1
      },
      triagePolicy: {
        key: "offering-readiness-triage",
        version: 1,
        statusOrder: ["not_ready", "insufficient_evidence", "ready"]
      },
      summary: {
        activeEnrollmentCount: 3,
        attentionCount: 2,
        notReadyCount: 1,
        insufficientEvidenceCount: 1,
        readyCount: 1
      }
    });

    expect(result.body?.learners.map((learner) => learner.enrollmentId)).toEqual([
      blockedEnrollmentId,
      insufficientEnrollmentId,
      readyEnrollmentId
    ]);
    expect(result.body?.learners.map((learner) => learner.status)).toEqual([
      "not_ready",
      "insufficient_evidence",
      "ready"
    ]);
    expect(
      result.body?.learners.some(
        (learner) => learner.enrollmentId === completedEnrollmentId
      )
    ).toBe(false);

    expect(result.body?.learners[0]?.skills[0]).toMatchObject({
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
    });
    expect(result.body?.learners[1]?.skills[0]).toMatchObject({
      skillId,
      status: "insufficient_evidence",
      scoredAttemptCount: 0
    });
    expect(result.body?.learners[2]?.skills[0]).toMatchObject({
      skillId,
      status: "ready",
      masteryScore: 1,
      scoredAttemptCount: 2,
      reasons: []
    });

    const afterOutbox = await migrationPool.query<CountRow>(
      `SELECT count(*)::text AS count
         FROM events.outbox
        WHERE organization_id = $1`,
      [organizationId]
    );
    expect(afterOutbox.rows[0]?.count).toBe(beforeOutbox.rows[0]?.count);
  });

  it("preserves the individual readiness endpoint after batch evaluator refactor", async () => {
    const response = await app.inject({
      method: "GET",
      url: `/v1/organizations/${organizationId}/enrollments/${readyEnrollmentId}/readiness`,
      headers: { "x-test-user-id": readyLearnerUserId }
    });
    expect(response.statusCode).toBe(200);
    const body = courseReadinessDecisionSchema.parse(JSON.parse(response.body));
    expect(body).toMatchObject({
      enrollmentId: readyEnrollmentId,
      status: "ready",
      skills: [
        {
          skillId,
          status: "ready",
          scoredAttemptCount: 2
        }
      ]
    });
  });
});
