import { randomUUID } from "node:crypto";

import type { NestFastifyApplication } from "@nestjs/platform-fastify";
import {
  attemptSchema,
  learningEventHistoryPageSchema,
  submissionSchema,
  validationResultSchema
} from "@platform/contracts";
import {
  createDatabasePool,
  withTenantTransaction,
  type DatabasePool
} from "@platform/database";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createApiApplication } from "./app.factory";
import {
  attachPlatformPrincipal,
  type PlatformPrincipalCarrier
} from "./request-context/platform-principal";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (value === undefined || value.trim().length === 0) {
    throw new Error(`${name} is required for learning-history integration tests.`);
  }
  return value;
}

type IdRow = { id: string };

describe("learner LearningEvent history", () => {
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
  let offeringId = "";
  let enrollmentId = "";
  let attemptId = "";
  let submissionId = "";
  let validationResultId = "";
  let systemErrorResultId = "";
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
      throw new Error("Failed to create learning-history test identity.");
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
      applicationName: "learning-history-integration-fixtures"
    });
    appPool = createDatabasePool(requireEnv("DATABASE_URL"), {
      applicationName: "learning-history-integration-app"
    });

    ownerUserId = await createUser("learning-history-owner");
    learnerUserId = await createUser("learning-history-learner");
    instructorUserId = await createUser("learning-history-instructor");

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

    const organization = await app.inject({
      method: "POST",
      url: "/v1/organizations",
      headers: { "x-test-user-id": ownerUserId },
      payload: {
        slug: `learning-history-${randomUUID()}`,
        name: "Learning history integration"
      }
    });
    if (organization.statusCode !== 201) {
      throw new Error(`Failed to create organization: ${organization.body}`);
    }
    organizationId = (JSON.parse(organization.body) as { id: string }).id;

    await activateMember(learnerUserId, "learner");
    await activateMember(instructorUserId, "instructor");

    const skill = await app.inject({
      method: "POST",
      url: `/v1/organizations/${organizationId}/skills`,
      headers: { "x-test-user-id": ownerUserId },
      payload: {
        key: `learning-history-${randomUUID()}`,
        title: "Learning history skill"
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
        slug: `learning-history-${randomUUID()}`,
        title: "Learning history course"
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
        slug: "learning-history-practice",
        activityType: "foundation.structured-practice",
        title: "Learning history practice",
        config: {
          validation: {
            validatorKey: "manual-review",
            validatorVersion: 1,
            config: { rubric: "history-v1" }
          }
        },
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
        slug: `learning-history-${randomUUID()}`,
        name: "Learning history offering",
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

    const attemptResponse = await app.inject({
      method: "POST",
      url: `/v1/organizations/${organizationId}/enrollments/${enrollmentId}/activities/${activityId}/attempts`,
      headers: { "x-test-user-id": learnerUserId },
      payload: {}
    });
    if (attemptResponse.statusCode !== 201) {
      throw new Error(`Failed to start attempt: ${attemptResponse.body}`);
    }
    attemptId = attemptSchema.parse(JSON.parse(attemptResponse.body)).id;

    const submissionResponse = await app.inject({
      method: "POST",
      url: `/v1/organizations/${organizationId}/attempts/${attemptId}/submissions`,
      headers: { "x-test-user-id": learnerUserId },
      payload: { payload: { answer: "private-answer-must-not-leak" } }
    });
    if (submissionResponse.statusCode !== 201) {
      throw new Error(`Failed to submit attempt: ${submissionResponse.body}`);
    }
    submissionId = submissionSchema.parse(JSON.parse(submissionResponse.body)).id;

    const validation = await app.inject({
      method: "POST",
      url: `/v1/organizations/${organizationId}/submissions/${submissionId}/validation-results`,
      headers: { "x-test-user-id": instructorUserId },
      payload: {
        idempotencyKey: `history-pass-${randomUUID()}`,
        status: "completed",
        outcome: "passed",
        score: 0.85,
        payload: { feedback: "private-validator-feedback" }
      }
    });
    if (validation.statusCode !== 201) {
      throw new Error(`Failed to record validation: ${validation.body}`);
    }
    validationResultId = validationResultSchema.parse(JSON.parse(validation.body)).id;

    const systemError = await app.inject({
      method: "POST",
      url: `/v1/organizations/${organizationId}/submissions/${submissionId}/validation-results`,
      headers: { "x-test-user-id": instructorUserId },
      payload: {
        idempotencyKey: `history-system-${randomUUID()}`,
        status: "system_error",
        payload: { reason: "private-infrastructure-error" }
      }
    });
    if (systemError.statusCode !== 201) {
      throw new Error(`Failed to record system error: ${systemError.body}`);
    }
    systemErrorResultId = validationResultSchema.parse(JSON.parse(systemError.body)).id;
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
        `DELETE FROM learning_history.learning_events WHERE organization_id = $1`,
        [organizationId]
      );
      await migrationPool.query(
        `DELETE FROM learning_progress.evidence WHERE organization_id = $1`,
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

  it("returns normalized canonical history without raw payloads or infrastructure failures", async () => {
    const response = await app.inject({
      method: "GET",
      url: `/v1/organizations/${organizationId}/enrollments/${enrollmentId}/learning-events`,
      headers: { "x-test-user-id": learnerUserId }
    });
    expect(response.statusCode).toBe(200);

    const page = learningEventHistoryPageSchema.parse(JSON.parse(response.body));
    expect(page.organizationId).toBe(organizationId);
    expect(page.enrollmentId).toBe(enrollmentId);
    expect(page.offeringId).toBe(offeringId);
    expect(page.nextCursor).toBeNull();

    const eventNames = page.events.map((event) => event.eventName);
    expect(page.events).toHaveLength(4);
    expect(new Set(eventNames).size).toBe(4);
    expect([...eventNames].sort()).toEqual(
      [
        "attempt.started",
        "submission.submitted",
        "validation.result_recorded",
        "evidence.recorded"
      ].sort()
    );
    expect(eventNames).not.toContain("attempt.submitted");

    const validationEvent = page.events.find(
      (event) => event.eventName === "validation.result_recorded"
    );
    expect(validationEvent).toMatchObject({
      validationResultId,
      outcome: "passed",
      score: 0.85
    });

    const serialized = JSON.stringify(page);
    expect(serialized).not.toContain("private-answer-must-not-leak");
    expect(serialized).not.toContain("private-validator-feedback");
    expect(serialized).not.toContain("private-infrastructure-error");
    expect(serialized).not.toContain(systemErrorResultId);
    expect(serialized).not.toContain("validatorKey");
    expect(serialized).not.toContain("evidenceTrust");
    expect(serialized).not.toContain('"payload"');
  });

  it("uses stable cursor pagination and enforces enrollment ownership", async () => {
    const denied = await app.inject({
      method: "GET",
      url: `/v1/organizations/${organizationId}/enrollments/${enrollmentId}/learning-events`,
      headers: { "x-test-user-id": instructorUserId }
    });
    expect(denied.statusCode).toBe(403);

    const full = await app.inject({
      method: "GET",
      url: `/v1/organizations/${organizationId}/enrollments/${enrollmentId}/learning-events`,
      headers: { "x-test-user-id": learnerUserId }
    });
    expect(full.statusCode).toBe(200);
    const fullPage = learningEventHistoryPageSchema.parse(JSON.parse(full.body));
    expect(fullPage.events).toHaveLength(4);
    expect(fullPage.nextCursor).toBeNull();

    const first = await app.inject({
      method: "GET",
      url: `/v1/organizations/${organizationId}/enrollments/${enrollmentId}/learning-events?limit=2`,
      headers: { "x-test-user-id": learnerUserId }
    });
    expect(first.statusCode).toBe(200);
    const firstPage = learningEventHistoryPageSchema.parse(JSON.parse(first.body));
    expect(firstPage.events).toHaveLength(2);
    expect(firstPage.nextCursor).not.toBeNull();

    const second = await app.inject({
      method: "GET",
      url: `/v1/organizations/${organizationId}/enrollments/${enrollmentId}/learning-events?limit=2&cursor=${encodeURIComponent(firstPage.nextCursor ?? "")}`,
      headers: { "x-test-user-id": learnerUserId }
    });
    expect(second.statusCode).toBe(200);
    const secondPage = learningEventHistoryPageSchema.parse(JSON.parse(second.body));
    expect(secondPage.events).toHaveLength(2);
    expect(secondPage.nextCursor).toBeNull();

    const paginatedIds = [...firstPage.events, ...secondPage.events].map(
      (event) => event.id
    );
    expect(paginatedIds).toEqual(fullPage.events.map((event) => event.id));
    expect(new Set(paginatedIds).size).toBe(4);

    const invalidCursor = await app.inject({
      method: "GET",
      url: `/v1/organizations/${organizationId}/enrollments/${enrollmentId}/learning-events?cursor=not-a-cursor`,
      headers: { "x-test-user-id": learnerUserId }
    });
    expect(invalidCursor.statusCode).toBe(400);
  });

  it("keeps completed enrollment history readable and the journal append-only", async () => {
    await migrationPool.query(
      `UPDATE learning_delivery.enrollments
          SET status = 'completed', completed_at = now()
        WHERE organization_id = $1 AND id = $2`,
      [organizationId, enrollmentId]
    );

    const response = await app.inject({
      method: "GET",
      url: `/v1/organizations/${organizationId}/enrollments/${enrollmentId}/learning-events`,
      headers: { "x-test-user-id": learnerUserId }
    });
    expect(response.statusCode).toBe(200);
    expect(
      learningEventHistoryPageSchema.parse(JSON.parse(response.body)).events
    ).toHaveLength(4);

    await expect(
      withTenantTransaction(
        appPool,
        { organizationId, userId: learnerUserId },
        async ({ client }) =>
          client.query(
            `UPDATE learning_history.learning_events
                SET score = 0
              WHERE organization_id = $1
                AND validation_result_id = $2`,
            [organizationId, validationResultId]
          )
      )
    ).rejects.toMatchObject({ code: "42501" });

    await expect(
      withTenantTransaction(
        appPool,
        { organizationId, userId: learnerUserId },
        async ({ client }) =>
          client.query(
            `DELETE FROM learning_history.learning_events
              WHERE organization_id = $1
                AND attempt_id = $2`,
            [organizationId, attemptId]
          )
      )
    ).rejects.toMatchObject({ code: "42501" });
  });
});