import { randomUUID } from "node:crypto";

import type { NestFastifyApplication } from "@nestjs/platform-fastify";
import {
  attemptSchema,
  submissionSchema,
  validationResultSchema
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
    throw new Error(`${name} is required for validation-result integration tests.`);
  }
  return value;
}

type IdRow = { id: string };

describe("validation result HTTP lifecycle", () => {
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
  let otherActivityVersionId = "";
  let offeringId = "";
  let enrollmentId = "";
  let attemptId = "";
  let submissionId = "";
  let validationResultId = "";
  let needsReviewValidationResultId = "";
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
      throw new Error("Failed to create validation-result test identity.");
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
      applicationName: "validation-result-integration-fixtures"
    });
    appPool = createDatabasePool(requireEnv("DATABASE_URL"), {
      applicationName: "validation-result-integration-app"
    });

    ownerUserId = await createUser("validation-result-owner");
    learnerUserId = await createUser("validation-result-learner");
    instructorUserId = await createUser("validation-result-instructor");

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

    organizationId = (await createTestOrganization(migrationPool, ownerUserId, {
        slug: `validation-result-${randomUUID()}`,
        name: "Validation result integration"
      })).id;

    await activateMember(learnerUserId, "learner");
    await activateMember(instructorUserId, "instructor");

    const skill = await app.inject({
      method: "POST",
      url: `/v1/organizations/${organizationId}/skills`,
      headers: { "x-test-user-id": ownerUserId },
      payload: {
        key: `validation-result-${randomUUID()}`,
        title: "Validation result skill"
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
        slug: `validation-result-${randomUUID()}`,
        title: "Validation result course"
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
        slug: "validation-result-practice",
        activityType: "foundation.structured-practice",
        title: "Validation result practice",
        config: {
          validation: {
            validatorKey: "manual-review",
            validatorVersion: 1,
            config: { rubric: "foundation-v1" }
          }
        },
        skillIds: [skillId]
      }
    });
    if (activity.statusCode !== 201) {
      throw new Error(`Failed to create validated activity: ${activity.body}`);
    }
    const activityBody = JSON.parse(activity.body) as {
      id: string;
      activityId: string;
    };
    activityVersionId = activityBody.id;
    activityId = activityBody.activityId;

    const otherActivity = await app.inject({
      method: "POST",
      url: `/v1/organizations/${organizationId}/courses/${courseId}/versions/${courseVersionId}/activities`,
      headers: { "x-test-user-id": ownerUserId },
      payload: {
        slug: "validation-result-other",
        activityType: "foundation.structured-practice",
        title: "Other validation result practice",
        skillIds: [skillId]
      }
    });
    if (otherActivity.statusCode !== 201) {
      throw new Error(`Failed to create second activity: ${otherActivity.body}`);
    }
    otherActivityVersionId = (JSON.parse(otherActivity.body) as { id: string }).id;

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
        slug: `validation-result-${randomUUID()}`,
        name: "Validation result offering",
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
    const attempt = attemptSchema.parse(JSON.parse(attemptResponse.body));
    attemptId = attempt.id;

    const submissionResponse = await app.inject({
      method: "POST",
      url: `/v1/organizations/${organizationId}/attempts/${attempt.id}/submissions`,
      headers: { "x-test-user-id": learnerUserId },
      payload: { payload: { answer: "grid-template-columns" } }
    });
    if (submissionResponse.statusCode !== 201) {
      throw new Error(`Failed to submit attempt: ${submissionResponse.body}`);
    }
    submissionId = submissionSchema.parse(JSON.parse(submissionResponse.body)).id;
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

  it("records one immutable result and materializes trusted Evidence exactly once", async () => {
    const idempotencyKey = `manual-review-${randomUUID()}`;
    const command = {
      idempotencyKey,
      status: "completed",
      outcome: "passed",
      score: 0.9,
      payload: { feedback: "Meets the rubric" }
    } as const;

    const recorded = await app.inject({
      method: "POST",
      url: `/v1/organizations/${organizationId}/submissions/${submissionId}/validation-results`,
      headers: { "x-test-user-id": instructorUserId },
      payload: command
    });
    expect(recorded.statusCode).toBe(201);
    const result = validationResultSchema.parse(JSON.parse(recorded.body));
    validationResultId = result.id;
    expect(result).toMatchObject({
      organizationId,
      submissionId,
      activityVersionId,
      validatorKey: "manual-review",
      validatorVersion: 1,
      validatorConfig: { rubric: "foundation-v1" },
      idempotencyKey,
      status: "completed",
      outcome: "passed",
      score: 0.9,
      evidenceTrust: "trusted",
      payload: { feedback: "Meets the rubric" },
      recordedByUserId: instructorUserId
    });

    const evidence = await migrationPool.query<{
      skill_id: string;
      kind: string;
      score: string | null;
      payload: Record<string, unknown>;
      recorded_by_user_id: string | null;
      source_type: string;
      source_validation_result_id: string | null;
    }>(
      `SELECT skill_id::text,
              kind,
              score::text,
              payload,
              recorded_by_user_id::text,
              source_type,
              source_validation_result_id::text
         FROM learning_progress.evidence
        WHERE organization_id = $1
          AND source_validation_result_id = $2`,
      [organizationId, result.id]
    );
    expect(evidence.rows).toHaveLength(1);
    expect(evidence.rows[0]).toMatchObject({
      skill_id: skillId,
      kind: "foundation.structured-practice",
      payload: { outcome: "passed" },
      recorded_by_user_id: null,
      source_type: "validation_result",
      source_validation_result_id: result.id
    });
    expect(Number(evidence.rows[0]?.score)).toBe(0.9);

    const mastery = await migrationPool.query<{
      mastery_score: string | null;
      evidence_count: number;
      scored_evidence_count: number;
    }>(
      `SELECT mastery_score::text,
              evidence_count,
              scored_evidence_count
         FROM learning_progress.mastery_projections
        WHERE organization_id = $1
          AND user_id = $2
          AND skill_id = $3`,
      [organizationId, learnerUserId, skillId]
    );
    expect(mastery.rows).toHaveLength(1);
    expect(Number(mastery.rows[0]?.mastery_score)).toBe(0.9);
    expect(mastery.rows[0]?.evidence_count).toBe(1);
    expect(mastery.rows[0]?.scored_evidence_count).toBe(1);

    const replay = await app.inject({
      method: "POST",
      url: `/v1/organizations/${organizationId}/submissions/${submissionId}/validation-results`,
      headers: { "x-test-user-id": instructorUserId },
      payload: command
    });
    expect(replay.statusCode).toBe(201);
    expect(validationResultSchema.parse(JSON.parse(replay.body)).id).toBe(result.id);

    const persisted = await migrationPool.query<{ count: number }>(
      `SELECT count(*)::integer AS count
         FROM learning_validation.validation_results
        WHERE organization_id = $1
          AND submission_id = $2
          AND validator_key = 'manual-review'
          AND validator_version = 1
          AND idempotency_key = $3`,
      [organizationId, submissionId, idempotencyKey]
    );
    expect(persisted.rows[0]?.count).toBe(1);

    const evidenceReplay = await migrationPool.query<{ count: number }>(
      `SELECT count(*)::integer AS count
         FROM learning_progress.evidence
        WHERE organization_id = $1
          AND source_validation_result_id = $2`,
      [organizationId, result.id]
    );
    expect(evidenceReplay.rows[0]?.count).toBe(1);

    const validationEvents = await migrationPool.query<{ count: number }>(
      `SELECT count(*)::integer AS count
         FROM events.outbox
        WHERE organization_id = $1
          AND event_name = 'validation.result_recorded'
          AND aggregate_type = 'validation_result'
          AND aggregate_id = $2`,
      [organizationId, result.id]
    );
    expect(validationEvents.rows[0]?.count).toBe(1);

    const evidenceEvents = await migrationPool.query<{ count: number }>(
      `SELECT count(*)::integer AS count
         FROM events.outbox
        WHERE organization_id = $1
          AND event_name = 'evidence.recorded'
          AND payload ->> 'sourceValidationResultId' = $2`,
      [organizationId, result.id]
    );
    expect(evidenceEvents.rows[0]?.count).toBe(1);

    const conflict = await app.inject({
      method: "POST",
      url: `/v1/organizations/${organizationId}/submissions/${submissionId}/validation-results`,
      headers: { "x-test-user-id": instructorUserId },
      payload: { ...command, outcome: "failed" }
    });
    expect(conflict.statusCode).toBe(409);
  });

  it("keeps non-decisive and infrastructure outcomes out of Evidence", async () => {
    const denied = await app.inject({
      method: "POST",
      url: `/v1/organizations/${organizationId}/submissions/${submissionId}/validation-results`,
      headers: { "x-test-user-id": learnerUserId },
      payload: {
        idempotencyKey: `learner-${randomUUID()}`,
        status: "completed",
        outcome: "passed",
        payload: {}
      }
    });
    expect(denied.statusCode).toBe(403);

    const review = await app.inject({
      method: "POST",
      url: `/v1/organizations/${organizationId}/submissions/${submissionId}/validation-results`,
      headers: { "x-test-user-id": instructorUserId },
      payload: {
        idempotencyKey: `needs-review-${randomUUID()}`,
        status: "completed",
        outcome: "needs_review",
        payload: { note: "Human decision still required" }
      }
    });
    expect(review.statusCode).toBe(201);
    needsReviewValidationResultId = validationResultSchema.parse(
      JSON.parse(review.body)
    ).id;

    const systemError = await app.inject({
      method: "POST",
      url: `/v1/organizations/${organizationId}/submissions/${submissionId}/validation-results`,
      headers: { "x-test-user-id": instructorUserId },
      payload: {
        idempotencyKey: `system-error-valid-${randomUUID()}`,
        status: "system_error",
        payload: { reason: "sandbox unavailable" }
      }
    });
    expect(systemError.statusCode).toBe(201);
    const systemErrorId = validationResultSchema.parse(
      JSON.parse(systemError.body)
    ).id;

    const nonDecisiveEvidence = await migrationPool.query<{ count: number }>(
      `SELECT count(*)::integer AS count
         FROM learning_progress.evidence
        WHERE organization_id = $1
          AND source_validation_result_id = ANY($2::uuid[])`,
      [organizationId, [needsReviewValidationResultId, systemErrorId]]
    );
    expect(nonDecisiveEvidence.rows[0]?.count).toBe(0);

    const contradictory = await app.inject({
      method: "POST",
      url: `/v1/organizations/${organizationId}/submissions/${submissionId}/validation-results`,
      headers: { "x-test-user-id": instructorUserId },
      payload: {
        idempotencyKey: `system-error-${randomUUID()}`,
        status: "system_error",
        outcome: "failed",
        score: 0,
        payload: { reason: "sandbox unavailable" }
      }
    });
    expect(contradictory.statusCode).toBe(400);
  });

  it("keeps validation attribution and Evidence provenance enforced in PostgreSQL", async () => {
    await expect(
      migrationPool.query(
        `INSERT INTO learning_validation.validation_results
           (organization_id, submission_id, activity_version_id,
            validator_key, validator_version, validator_config, idempotency_key,
            status, outcome, score, evidence_trust, payload, recorded_by_user_id)
         VALUES ($1, $2, $3, 'manual-review', 1, '{}'::jsonb, $4,
                 'completed', 'passed', 1, 'trusted', '{}'::jsonb, $5)`,
        [
          organizationId,
          submissionId,
          otherActivityVersionId,
          `mismatch-${randomUUID()}`,
          instructorUserId
        ]
      )
    ).rejects.toMatchObject({ code: "23514" });

    await expect(
      migrationPool.query(
        `INSERT INTO learning_validation.validation_results
           (organization_id, submission_id, activity_version_id,
            validator_key, validator_version, validator_config, idempotency_key,
            status, outcome, score, evidence_trust, payload, recorded_by_user_id)
         VALUES ($1, $2, $3, 'manual-review', 1, '{}'::jsonb, $4,
                 'system_error', 'failed', 0, 'trusted', '{}'::jsonb, $5)`,
        [
          organizationId,
          submissionId,
          activityVersionId,
          `invalid-system-error-${randomUUID()}`,
          instructorUserId
        ]
      )
    ).rejects.toMatchObject({ code: "23514" });

    await expect(
      migrationPool.query(
        `INSERT INTO learning_progress.evidence
           (organization_id, attempt_id, submission_id, skill_id, kind, score,
            payload, recorded_by_user_id, source_type, source_validation_result_id)
         VALUES ($1, $2, $3, $4, 'foundation.structured-practice', 0.5,
                 '{}'::jsonb, NULL, 'validation_result', $5)`,
        [
          organizationId,
          attemptId,
          submissionId,
          skillId,
          needsReviewValidationResultId
        ]
      )
    ).rejects.toMatchObject({ code: "23514" });

    await expect(
      withTenantTransaction(
        appPool,
        { organizationId, userId: instructorUserId },
        async ({ client }) =>
          client.query(
            `UPDATE learning_validation.validation_results
                SET payload = '{"changed":true}'::jsonb
              WHERE organization_id = $1 AND id = $2`,
            [organizationId, validationResultId]
          )
      )
    ).rejects.toMatchObject({ code: "42501" });

    await expect(
      withTenantTransaction(
        appPool,
        { organizationId, userId: instructorUserId },
        async ({ client }) =>
          client.query(
            `DELETE FROM learning_validation.validation_results
              WHERE organization_id = $1 AND id = $2`,
            [organizationId, validationResultId]
          )
      )
    ).rejects.toMatchObject({ code: "42501" });
  });
});
