import { randomUUID } from "node:crypto";

import type { NestFastifyApplication } from "@nestjs/platform-fastify";
import { nextLearningRecommendationSchema } from "@platform/contracts";
import { createDatabasePool } from "@platform/database";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createTestOrganization } from "./test-support/create-test-organization";
import { createApiApplication } from "./app.factory";
import {
  attachPlatformPrincipal,
  type PlatformPrincipalCarrier
} from "./request-context/platform-principal";
import { startAndSubmitAttempt } from "./test-support/start-and-submit-attempt";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (value === undefined || value.trim().length === 0) {
    throw new Error(
      `${name} is required for remediation intervention integration tests.`
    );
  }
  return value;
}

type IdRow = { id: string };

describe("authored remediation intervention HTTP lifecycle", () => {
  const migrationPool = createDatabasePool(
    requireEnv("DATABASE_MIGRATION_URL"),
    { applicationName: "remediation-intervention-http-integration-fixtures" }
  );

  let app: NestFastifyApplication;
  let ownerUserId = "";
  let learnerUserId = "";
  let organizationId = "";
  let courseId = "";
  let courseVersionId = "";
  let skillId = "";
  let baselineActivityId = "";
  let baselineActivityVersionId = "";
  let remediationActivityId = "";
  let remediationActivityVersionId = "";
  let diagnosticActivityId = "";
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
      throw new Error(
        "Failed to create remediation-intervention test identity."
      );
    }
    createdUserIds.push(id);
    return id;
  }

  async function createActivity(
    slug: string,
    title: string,
    position: number
  ): Promise<{ activityId: string; activityVersionId: string }> {
    const response = await app.inject({
      method: "POST",
      url: `/v1/organizations/${organizationId}/courses/${courseId}/versions/${courseVersionId}/activities`,
      headers: { "x-test-user-id": ownerUserId },
      payload: {
        slug,
        activityType: "pern.code-project",
        title,
        position,
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
    expect(response.statusCode).toBe(201);
    const body = JSON.parse(response.body) as {
      id: string;
      activityId: string;
    };
    return {
      activityId: body.activityId,
      activityVersionId: body.id
    };
  }

  async function recordOutcome(
    activityId: string,
    outcome: "passed" | "failed",
    sequence: number
  ): Promise<void> {
    const attempt = await startAndSubmitAttempt(app, {
      url: `/v1/organizations/${organizationId}/enrollments/${enrollmentId}/activities/${activityId}/attempts`,
      headers: { "x-test-user-id": learnerUserId },
      submission: { source: `intervention-attempt-${sequence}` }
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
        idempotencyKey: `remediation-${sequence}-${outcome}`,
        status: "completed",
        outcome,
        score: outcome === "passed" ? 1 : 0,
        payload: {
          diagnosticDetail: "must-not-become-an-intervention-input"
        }
      }
    });
    expect(validation.statusCode).toBe(201);
  }

  beforeAll(async () => {
    ownerUserId = await createUser("remediation-owner");
    learnerUserId = await createUser("remediation-learner");

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
        slug: `remediation-${randomUUID()}`,
        name: "Remediation intervention integration"
      })
    ).id;

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
        key: `remediation-skill-${randomUUID()}`,
        title: "Transactional state transitions"
      }
    });
    expect(skill.statusCode).toBe(201);
    skillId = (JSON.parse(skill.body) as { id: string }).id;

    const course = await app.inject({
      method: "POST",
      url: `/v1/organizations/${organizationId}/courses`,
      headers: { "x-test-user-id": ownerUserId },
      payload: {
        slug: `remediation-course-${randomUUID()}`,
        title: "Authored remediation intervention course"
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

    const baseline = await createActivity(
      "ordinary-practice",
      "Ordinary state transition practice",
      0
    );
    baselineActivityId = baseline.activityId;
    baselineActivityVersionId = baseline.activityVersionId;

    const remediation = await createActivity(
      "targeted-remediation",
      "Targeted state transition remediation",
      1
    );
    remediationActivityId = remediation.activityId;
    remediationActivityVersionId = remediation.activityVersionId;

    const diagnostic = await createActivity(
      "diagnostic-practice",
      "Diagnostic state transition practice",
      2
    );
    diagnosticActivityId = diagnostic.activityId;

    const remediationUrl = `/v1/organizations/${organizationId}/courses/${courseId}/versions/${courseVersionId}/skills/${skillId}/remediations`;
    const [remediationMapping, concurrentRetry] = await Promise.all([
      app.inject({
        method: "PUT",
        url: remediationUrl,
        headers: { "x-test-user-id": ownerUserId },
        payload: { activityIds: [remediationActivityId] }
      }),
      app.inject({
        method: "PUT",
        url: remediationUrl,
        headers: { "x-test-user-id": ownerUserId },
        payload: { activityIds: [remediationActivityId] }
      })
    ]);
    expect(remediationMapping.statusCode).toBe(200);
    expect(concurrentRetry.statusCode).toBe(200);

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
        slug: `remediation-offering-${randomUUID()}`,
        name: "Authored remediation intervention offering",
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

      const cleanupClient = await migrationPool.connect();
      try {
        await cleanupClient.query("BEGIN");
        await cleanupClient.query(
          `ALTER TABLE learning_content.course_version_skill_remediations
             DISABLE TRIGGER course_version_skill_remediations_require_draft`
        );
        await cleanupClient.query(
          `DELETE FROM learning_content.course_version_skill_remediations
            WHERE organization_id = $1`,
          [organizationId]
        );
        await cleanupClient.query(
          `ALTER TABLE learning_content.course_version_skill_remediations
             ENABLE TRIGGER course_version_skill_remediations_require_draft`
        );
        await cleanupClient.query("COMMIT");
      } catch (error) {
        await cleanupClient.query("ROLLBACK");
        throw error;
      } finally {
        cleanupClient.release();
      }

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

  it("serializes concurrent identical remediation authoring into one canonical change", async () => {
    const rows = await migrationPool.query<{
      activity_id: string;
      position: number;
    }>(
      `SELECT activity_id::text, position
         FROM learning_content.course_version_skill_remediations
        WHERE organization_id = $1
          AND course_version_id = $2
          AND skill_id = $3`,
      [organizationId, courseVersionId, skillId]
    );
    expect(rows.rows).toEqual([
      { activity_id: remediationActivityId, position: 0 }
    ]);

    const outbox = await migrationPool.query<{ count: string }>(
      `SELECT count(*)::text AS count
         FROM events.outbox
        WHERE organization_id = $1
          AND event_name = 'course_version.skill_remediations_replaced'`,
      [organizationId]
    );
    expect(outbox.rows[0]?.count).toBe("1");
  });

  it("starts on the ordinary baseline activity without an intervention", async () => {
    const response = await app.inject({
      method: "GET",
      url: `/v1/organizations/${organizationId}/enrollments/${enrollmentId}/recommendation`,
      headers: { "x-test-user-id": learnerUserId }
    });
    expect(response.statusCode).toBe(200);

    const body = nextLearningRecommendationSchema.parse(
      JSON.parse(response.body)
    );
    expect(body).toMatchObject({
      status: "recommended",
      interventionPolicy: {
        key: "repeated-failure-remediation",
        version: 1
      },
      recommendation: {
        activity: {
          activityVersionId: baselineActivityVersionId,
          activityId: baselineActivityId
        },
        focusSkill: { skillId },
        misconceptionSignal: null
      }
    });
    if (body.status !== "recommended") {
      throw new Error("Expected an ordinary baseline recommendation.");
    }
    expect(body.recommendation.intervention).toBeUndefined();
  });

  it("overrides the ordinary action with the authored remediation after repeated trusted failures", async () => {
    await recordOutcome(diagnosticActivityId, "failed", 1);
    await recordOutcome(diagnosticActivityId, "failed", 2);

    const response = await app.inject({
      method: "GET",
      url: `/v1/organizations/${organizationId}/enrollments/${enrollmentId}/recommendation`,
      headers: { "x-test-user-id": learnerUserId }
    });
    expect(response.statusCode).toBe(200);

    const body = nextLearningRecommendationSchema.parse(
      JSON.parse(response.body)
    );
    expect(body.status).toBe("recommended");
    if (body.status !== "recommended") {
      throw new Error("Expected a remediation recommendation.");
    }

    expect(body.recommendation).toMatchObject({
      activity: {
        activityVersionId: remediationActivityVersionId,
        activityId: remediationActivityId
      },
      focusSkill: {
        skillId,
        masteryScore: 0
      },
      reason: {
        code: "focus_skill_below_target",
        attemptCount: 0
      },
      misconceptionSignal: {
        status: "suspected",
        code: "repeated_trusted_failure",
        skillId,
        consecutiveFailureCount: 2
      },
      intervention: {
        code: "repeated_trusted_failure_remediation",
        signalCode: "repeated_trusted_failure",
        replacedActivityVersionId: baselineActivityVersionId,
        remediationPosition: 0
      }
    });
  });

  it("clears the intervention after a trusted pass and resumes baseline sequencing", async () => {
    await recordOutcome(remediationActivityId, "passed", 3);

    const response = await app.inject({
      method: "GET",
      url: `/v1/organizations/${organizationId}/enrollments/${enrollmentId}/recommendation`,
      headers: { "x-test-user-id": learnerUserId }
    });
    expect(response.statusCode).toBe(200);

    const body = nextLearningRecommendationSchema.parse(
      JSON.parse(response.body)
    );
    expect(body.status).toBe("recommended");
    if (body.status !== "recommended") {
      throw new Error("Expected baseline sequencing to resume.");
    }

    expect(body.recommendation.activity).toMatchObject({
      activityVersionId: baselineActivityVersionId,
      activityId: baselineActivityId
    });
    expect(body.recommendation.misconceptionSignal).toBeNull();
    expect(body.recommendation.intervention).toBeUndefined();
  });

  it("rejects remediation changes after the CourseVersion is published", async () => {
    const response = await app.inject({
      method: "PUT",
      url: `/v1/organizations/${organizationId}/courses/${courseId}/versions/${courseVersionId}/skills/${skillId}/remediations`,
      headers: { "x-test-user-id": ownerUserId },
      payload: { activityIds: [] }
    });
    expect(response.statusCode).toBe(409);
  });

  it("clones remediation intent into the next draft by stable Activity identity", async () => {
    const nextVersion = await app.inject({
      method: "POST",
      url: `/v1/organizations/${organizationId}/courses/${courseId}/versions`,
      headers: { "x-test-user-id": ownerUserId },
      payload: {
        title: "Authored remediation intervention course v2"
      }
    });
    expect(nextVersion.statusCode).toBe(201);
    const nextVersionId = (JSON.parse(nextVersion.body) as { id: string }).id;

    const rows = await migrationPool.query<{
      skill_id: string;
      activity_id: string;
      position: number;
    }>(
      `SELECT skill_id::text, activity_id::text, position
         FROM learning_content.course_version_skill_remediations
        WHERE organization_id = $1
          AND course_version_id = $2
        ORDER BY skill_id, position, activity_id`,
      [organizationId, nextVersionId]
    );
    expect(rows.rows).toEqual([
      {
        skill_id: skillId,
        activity_id: remediationActivityId,
        position: 0
      }
    ]);
  });
});
