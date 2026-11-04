import { randomUUID } from "node:crypto";

import type { NestFastifyApplication } from "@nestjs/platform-fastify";
import {
  attemptSchema,
  evidenceSchema,
  submissionSchema
} from "@platform/contracts";
import {
  createDatabasePool,
  withTenantTransaction,
  type DatabasePool
} from "@platform/database";
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
      `${name} is required for attempt/submission integration tests.`
    );
  }
  return value;
}

type IdRow = { id: string };

describe("attempt and submission HTTP lifecycle", () => {
  let migrationPool: DatabasePool;
  let appPool: DatabasePool;
  let app: NestFastifyApplication;
  let ownerUserId = "";
  let learnerUserId = "";
  let instructorUserId = "";
  let organizationId = "";
  let courseId = "";
  let courseVersionId = "";
  let skillId = "";
  let activityId = "";
  let activityVersionId = "";
  let offeringId = "";
  let enrollmentId = "";
  let submittedAttemptId = "";
  let submissionId = "";
  let startedOnlyAttemptId = "";
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
      throw new Error("Failed to create attempt/submission test identity.");
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
    migrationPool = createDatabasePool(requireEnv("DATABASE_MIGRATION_URL"), {
      applicationName: "attempt-submission-integration-fixtures"
    });
    appPool = createDatabasePool(requireEnv("DATABASE_URL"), {
      applicationName: "attempt-submission-integration-app"
    });

    ownerUserId = await createUser("attempt-submission-owner");
    learnerUserId = await createUser("attempt-submission-learner");
    instructorUserId = await createUser("attempt-submission-instructor");

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
        slug: `attempt-submission-${randomUUID()}`,
        name: "Attempt submission integration"
      })
    ).id;

    await activateMember(learnerUserId, "learner");
    await activateMember(instructorUserId, "instructor");

    const skill = await app.inject({
      method: "POST",
      url: `/v1/organizations/${organizationId}/skills`,
      headers: { "x-test-user-id": ownerUserId },
      payload: {
        key: `attempt-submission-${randomUUID()}`,
        title: "Attempt submission skill"
      }
    });
    if (skill.statusCode !== 201) {
      throw new Error(`Failed to create skill: ${skill.body}`);
    }
    skillId = (JSON.parse(skill.body) as { id: string }).id;

    const course = await app.inject({
      method: "POST",
      url: `/v1/organizations/${organizationId}/courses`,
      headers: { "x-test-user-id": ownerUserId },
      payload: {
        slug: `attempt-submission-${randomUUID()}`,
        title: "Attempt submission course"
      }
    });
    if (course.statusCode !== 201) {
      throw new Error(`Failed to create course: ${course.body}`);
    }
    const courseBody = JSON.parse(course.body) as {
      course: { id: string };
      draftVersion: { id: string };
    };
    courseId = courseBody.course.id;
    courseVersionId = courseBody.draftVersion.id;

    const attach = await app.inject({
      method: "POST",
      url: `/v1/organizations/${organizationId}/courses/${courseId}/versions/${courseVersionId}/skills`,
      headers: { "x-test-user-id": ownerUserId },
      payload: { skillId }
    });
    if (attach.statusCode !== 201) {
      throw new Error(`Failed to attach skill: ${attach.body}`);
    }

    const activity = await app.inject({
      method: "POST",
      url: `/v1/organizations/${organizationId}/courses/${courseId}/versions/${courseVersionId}/activities`,
      headers: { "x-test-user-id": ownerUserId },
      payload: {
        slug: "attempt-submission-practice",
        activityType: "foundation.structured-practice",
        title: "Attempt submission practice",
        skillIds: [skillId]
      }
    });
    if (activity.statusCode !== 201) {
      throw new Error(`Failed to create activity: ${activity.body}`);
    }
    const activityBody = JSON.parse(activity.body) as {
      id: string;
      activityId: string;
    };
    activityVersionId = activityBody.id;
    activityId = activityBody.activityId;

    const publish = await app.inject({
      method: "POST",
      url: `/v1/organizations/${organizationId}/courses/${courseId}/versions/${courseVersionId}/publish`,
      headers: { "x-test-user-id": ownerUserId }
    });
    if (publish.statusCode !== 200) {
      throw new Error(`Failed to publish course: ${publish.body}`);
    }

    const offering = await app.inject({
      method: "POST",
      url: `/v1/organizations/${organizationId}/offerings`,
      headers: { "x-test-user-id": ownerUserId },
      payload: {
        courseVersionId,
        slug: `attempt-submission-${randomUUID()}`,
        name: "Attempt submission offering",
        deliveryMode: "self_paced"
      }
    });
    if (offering.statusCode !== 201) {
      throw new Error(`Failed to create offering: ${offering.body}`);
    }
    offeringId = (JSON.parse(offering.body) as { id: string }).id;

    const enrollment = await app.inject({
      method: "POST",
      url: `/v1/organizations/${organizationId}/offerings/${offeringId}/enrollments`,
      headers: { "x-test-user-id": ownerUserId },
      payload: { userId: learnerUserId }
    });
    if (enrollment.statusCode !== 201) {
      throw new Error(`Failed to create enrollment: ${enrollment.body}`);
    }
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
        `DELETE FROM learning_progress.submissions WHERE organization_id = $1`,
        [organizationId]
      );
      await migrationPool.query(
        `DELETE FROM learning_progress.attempts WHERE organization_id = $1`,
        [organizationId]
      );
      await migrationPool.query(
        `DELETE FROM learning_progress.mastery_projections WHERE organization_id = $1`,
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

    await appPool.end();
    await migrationPool.end();
  });

  it("starts an Attempt before its Submission and binds Evidence to the Submission", async () => {
    const started = await app.inject({
      method: "POST",
      url: `/v1/organizations/${organizationId}/enrollments/${enrollmentId}/activities/${activityId}/attempts`,
      headers: { "x-test-user-id": learnerUserId },
      payload: {}
    });
    expect(started.statusCode).toBe(201);
    const attempt = attemptSchema.parse(JSON.parse(started.body));
    submittedAttemptId = attempt.id;
    expect(attempt.activityVersionId).toBe(activityVersionId);
    expect(attempt.attemptNumber).toBe(1);

    const beforeSubmission = await migrationPool.query<{ count: number }>(
      `SELECT count(*)::integer AS count
         FROM learning_progress.submissions
        WHERE organization_id = $1
          AND attempt_id = $2`,
      [organizationId, attempt.id]
    );
    expect(beforeSubmission.rows[0]?.count).toBe(0);

    // Evidence is recorded only against a Submission; the transitional
    // Evidence-by-Attempt route is gone.
    const attemptEvidence = await app.inject({
      method: "POST",
      url: `/v1/organizations/${organizationId}/attempts/${attempt.id}/evidence`,
      headers: { "x-test-user-id": instructorUserId },
      payload: {
        skillId,
        kind: "manual-review",
        score: 0.5
      }
    });
    expect(attemptEvidence.statusCode).toBe(404);

    const startWithWork = await app.inject({
      method: "POST",
      url: `/v1/organizations/${organizationId}/enrollments/${enrollmentId}/activities/${activityId}/attempts`,
      headers: { "x-test-user-id": learnerUserId },
      payload: { submission: { answer: "inline work" } }
    });
    expect(startWithWork.statusCode).toBe(400);

    const submitted = await app.inject({
      method: "POST",
      url: `/v1/organizations/${organizationId}/attempts/${attempt.id}/submissions`,
      headers: { "x-test-user-id": learnerUserId },
      payload: {
        payload: { answer: "grid-template-columns" }
      }
    });
    expect(submitted.statusCode).toBe(201);
    const submission = submissionSchema.parse(JSON.parse(submitted.body));
    submissionId = submission.id;
    expect(submission.attemptId).toBe(attempt.id);
    expect(submission.submittedByUserId).toBe(learnerUserId);

    const duplicate = await app.inject({
      method: "POST",
      url: `/v1/organizations/${organizationId}/attempts/${attempt.id}/submissions`,
      headers: { "x-test-user-id": learnerUserId },
      payload: { payload: { answer: "second" } }
    });
    expect(duplicate.statusCode).toBe(409);

    const evidenceResponse = await app.inject({
      method: "POST",
      url: `/v1/organizations/${organizationId}/submissions/${submission.id}/evidence`,
      headers: { "x-test-user-id": instructorUserId },
      payload: {
        skillId,
        kind: "manual-review",
        score: 0.9,
        payload: { rubric: "passed" }
      }
    });
    expect(evidenceResponse.statusCode).toBe(201);
    const evidence = evidenceSchema.parse(JSON.parse(evidenceResponse.body));
    expect(evidence.attemptId).toBe(attempt.id);
    expect(evidence.submissionId).toBe(submission.id);
  });

  it("keeps Submission ownership and immutability enforced in PostgreSQL", async () => {
    const started = await app.inject({
      method: "POST",
      url: `/v1/organizations/${organizationId}/enrollments/${enrollmentId}/activities/${activityId}/attempts`,
      headers: { "x-test-user-id": learnerUserId },
      payload: {}
    });
    expect(started.statusCode).toBe(201);
    startedOnlyAttemptId = attemptSchema.parse(JSON.parse(started.body)).id;

    await expect(
      migrationPool.query(
        `INSERT INTO learning_progress.submissions
           (organization_id, attempt_id, payload, submitted_by_user_id)
         VALUES ($1, $2, '{}'::jsonb, $3)`,
        [organizationId, startedOnlyAttemptId, instructorUserId]
      )
    ).rejects.toMatchObject({ code: "23514" });

    await expect(
      withTenantTransaction(
        appPool,
        { organizationId, userId: learnerUserId },
        async ({ client }) =>
          client.query(
            `INSERT INTO learning_progress.attempts
               (organization_id, enrollment_id, activity_version_id,
                attempt_number, submission, submitted_at)
             VALUES ($1, $2, $3, 99, '{}'::jsonb, now())`,
            [organizationId, enrollmentId, activityVersionId]
          )
      )
    ).rejects.toMatchObject({ code: "55000" });

    await expect(
      withTenantTransaction(
        appPool,
        { organizationId, userId: learnerUserId },
        async ({ client }) =>
          client.query(
            `UPDATE learning_progress.submissions
                SET payload = '{"changed":true}'::jsonb
              WHERE organization_id = $1 AND id = $2`,
            [organizationId, submissionId]
          )
      )
    ).rejects.toMatchObject({ code: "42501" });

    await expect(
      withTenantTransaction(
        appPool,
        { organizationId, userId: learnerUserId },
        async ({ client }) =>
          client.query(
            `DELETE FROM learning_progress.submissions
              WHERE organization_id = $1 AND id = $2`,
            [organizationId, submissionId]
          )
      )
    ).rejects.toMatchObject({ code: "42501" });
  });

  it("emits the split lifecycle events transactionally", async () => {
    const events = await migrationPool.query<{ event_name: string }>(
      `SELECT event_name
         FROM events.outbox
        WHERE organization_id = $1
          AND (
            (aggregate_type = 'attempt' AND aggregate_id = $2)
            OR
            (aggregate_type = 'submission' AND aggregate_id = $3)
          )
        ORDER BY occurred_at, id`,
      [organizationId, submittedAttemptId, submissionId]
    );

    expect(events.rows.map((row) => row.event_name)).toEqual([
      "attempt.started",
      "submission.submitted"
    ]);
  });
});
