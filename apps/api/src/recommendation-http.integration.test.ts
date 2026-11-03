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

function requireEnv(name: string): string {
  const value = process.env[name];
  if (value === undefined || value.trim().length === 0) {
    throw new Error(
      `${name} is required for Recommendation integration tests.`
    );
  }
  return value;
}

type IdRow = { id: string };

describe("adaptive recommendation HTTP lifecycle", () => {
  const migrationPool = createDatabasePool(
    requireEnv("DATABASE_MIGRATION_URL"),
    { applicationName: "recommendation-http-integration-fixtures" }
  );

  let app: NestFastifyApplication;
  let ownerUserId = "";
  let learnerUserId = "";
  let otherLearnerUserId = "";
  let instructorUserId = "";
  let organizationId = "";
  let courseId = "";
  let courseVersionId = "";
  let firstSkillId = "";
  let secondSkillId = "";
  let firstActivityId = "";
  let firstActivityVersionId = "";
  let secondActivityId = "";
  let secondActivityVersionId = "";
  let offeringId = "";
  let enrollmentId = "";
  let firstAttemptId = "";
  let secondAttemptId = "";
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
        "Failed to create Recommendation integration-test identity."
      );
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
    ownerUserId = await createUser("recommendation-owner");
    learnerUserId = await createUser("recommendation-learner");
    otherLearnerUserId = await createUser("recommendation-other-learner");
    instructorUserId = await createUser("recommendation-instructor");

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
        slug: `recommendation-${randomUUID()}`,
        name: "Recommendation integration"
      })
    ).id;

    await activateMember(learnerUserId, "learner");
    await activateMember(otherLearnerUserId, "learner");
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

  it("builds a published two-skill learning graph and enrolls the learner", async () => {
    const firstSkill = await app.inject({
      method: "POST",
      url: `/v1/organizations/${organizationId}/skills`,
      headers: { "x-test-user-id": ownerUserId },
      payload: {
        key: `adaptive-first-${randomUUID()}`,
        title: "Foundational layout"
      }
    });
    expect(firstSkill.statusCode).toBe(201);
    firstSkillId = (JSON.parse(firstSkill.body) as { id: string }).id;

    const secondSkill = await app.inject({
      method: "POST",
      url: `/v1/organizations/${organizationId}/skills`,
      headers: { "x-test-user-id": ownerUserId },
      payload: {
        key: `adaptive-second-${randomUUID()}`,
        title: "Responsive composition"
      }
    });
    expect(secondSkill.statusCode).toBe(201);
    secondSkillId = (JSON.parse(secondSkill.body) as { id: string }).id;

    const course = await app.inject({
      method: "POST",
      url: `/v1/organizations/${organizationId}/courses`,
      headers: { "x-test-user-id": ownerUserId },
      payload: {
        slug: `adaptive-course-${randomUUID()}`,
        title: "Adaptive frontend foundations"
      }
    });
    expect(course.statusCode).toBe(201);
    const createdCourse = JSON.parse(course.body) as {
      course: { id: string };
      draftVersion: { id: string };
    };
    courseId = createdCourse.course.id;
    courseVersionId = createdCourse.draftVersion.id;

    for (const [skillId, position] of [
      [firstSkillId, 0],
      [secondSkillId, 1]
    ] as const) {
      const attached = await app.inject({
        method: "POST",
        url: `/v1/organizations/${organizationId}/courses/${courseId}/versions/${courseVersionId}/skills`,
        headers: { "x-test-user-id": ownerUserId },
        payload: { skillId, position }
      });
      expect(attached.statusCode).toBe(201);
    }

    const firstActivity = await app.inject({
      method: "POST",
      url: `/v1/organizations/${organizationId}/courses/${courseId}/versions/${courseVersionId}/activities`,
      headers: { "x-test-user-id": ownerUserId },
      payload: {
        slug: "foundational-layout-practice",
        activityType: "pern.code-project",
        title: "Practice foundational layout",
        position: 0,
        skillIds: [firstSkillId]
      }
    });
    expect(firstActivity.statusCode).toBe(201);
    const firstActivityBody = JSON.parse(firstActivity.body) as {
      id: string;
      activityId: string;
    };
    firstActivityVersionId = firstActivityBody.id;
    firstActivityId = firstActivityBody.activityId;

    const secondActivity = await app.inject({
      method: "POST",
      url: `/v1/organizations/${organizationId}/courses/${courseId}/versions/${courseVersionId}/activities`,
      headers: { "x-test-user-id": ownerUserId },
      payload: {
        slug: "responsive-composition-practice",
        activityType: "pern.code-project",
        title: "Practice responsive composition",
        position: 1,
        skillIds: [secondSkillId]
      }
    });
    expect(secondActivity.statusCode).toBe(201);
    const secondActivityBody = JSON.parse(secondActivity.body) as {
      id: string;
      activityId: string;
    };
    secondActivityVersionId = secondActivityBody.id;
    secondActivityId = secondActivityBody.activityId;

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
        slug: `adaptive-offering-${randomUUID()}`,
        name: "Adaptive self-paced offering",
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

  it("recommends the first unobserved skill deterministically", async () => {
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
      throw new Error("Expected an activity recommendation.");
    }

    expect(body).toMatchObject({
      enrollmentId,
      offeringId,
      courseVersionId,
      policy: {
        key: "ordered-mastery",
        version: 1,
        masteryTarget: 0.8
      },
      recommendation: {
        kind: "activity",
        activity: {
          activityVersionId: firstActivityVersionId,
          activityId: firstActivityId
        },
        focusSkill: {
          skillId: firstSkillId,
          masteryScore: null,
          targetMasteryScore: 0.8
        },
        reason: {
          code: "focus_skill_unobserved",
          attemptCount: 0
        }
      }
    });
  });

  it("separates self recommendation reads from other-learner visibility", async () => {
    const forbidden = await app.inject({
      method: "GET",
      url: `/v1/organizations/${organizationId}/enrollments/${enrollmentId}/recommendation`,
      headers: { "x-test-user-id": otherLearnerUserId }
    });
    expect(forbidden.statusCode).toBe(403);

    const instructor = await app.inject({
      method: "GET",
      url: `/v1/organizations/${organizationId}/enrollments/${enrollmentId}/recommendation`,
      headers: { "x-test-user-id": instructorUserId }
    });
    expect(instructor.statusCode).toBe(200);
  });

  it("counts Attempts without treating an Attempt as Mastery", async () => {
    const attempt = await app.inject({
      method: "POST",
      url: `/v1/organizations/${organizationId}/enrollments/${enrollmentId}/activities/${firstActivityId}/attempts`,
      headers: { "x-test-user-id": learnerUserId },
      payload: { submission: { repository: "first-practice" } }
    });
    expect(attempt.statusCode).toBe(201);
    firstAttemptId = (JSON.parse(attempt.body) as { id: string }).id;

    const response = await app.inject({
      method: "GET",
      url: `/v1/organizations/${organizationId}/enrollments/${enrollmentId}/recommendation`,
      headers: { "x-test-user-id": learnerUserId }
    });
    const body = nextLearningRecommendationSchema.parse(
      JSON.parse(response.body)
    );

    expect(response.statusCode).toBe(200);
    expect(body.status).toBe("recommended");
    if (body.status !== "recommended") {
      throw new Error("Expected the first skill to remain the focus.");
    }
    expect(body.recommendation).toMatchObject({
      activity: { activityId: firstActivityId },
      focusSkill: { skillId: firstSkillId, masteryScore: null },
      reason: { code: "focus_skill_unobserved", attemptCount: 1 }
    });
  });

  it("moves Activity -> Attempt -> Evidence -> Mastery -> Recommendation -> next Activity", async () => {
    const evidence = await app.inject({
      method: "POST",
      url: `/v1/organizations/${organizationId}/attempts/${firstAttemptId}/evidence`,
      headers: { "x-test-user-id": instructorUserId },
      payload: {
        skillId: firstSkillId,
        kind: "manual-review",
        score: 1
      }
    });
    expect(evidence.statusCode).toBe(201);

    const mastery = await app.inject({
      method: "GET",
      url: `/v1/organizations/${organizationId}/users/${learnerUserId}/mastery`,
      headers: { "x-test-user-id": learnerUserId }
    });
    expect(mastery.statusCode).toBe(200);
    expect(JSON.parse(mastery.body)).toEqual([
      expect.objectContaining({
        userId: learnerUserId,
        skillId: firstSkillId,
        masteryScore: 1
      })
    ]);

    const recommendation = await app.inject({
      method: "GET",
      url: `/v1/organizations/${organizationId}/enrollments/${enrollmentId}/recommendation`,
      headers: { "x-test-user-id": learnerUserId }
    });
    expect(recommendation.statusCode).toBe(200);

    const body = nextLearningRecommendationSchema.parse(
      JSON.parse(recommendation.body)
    );
    expect(body.status).toBe("recommended");
    if (body.status !== "recommended") {
      throw new Error("Expected the second activity recommendation.");
    }
    expect(body.recommendation).toMatchObject({
      activity: {
        activityVersionId: secondActivityVersionId,
        activityId: secondActivityId
      },
      focusSkill: {
        skillId: secondSkillId,
        masteryScore: null
      },
      reason: {
        code: "focus_skill_unobserved",
        attemptCount: 0
      }
    });
  });

  it("reports mastery_target_met without completing the Enrollment", async () => {
    const attempt = await app.inject({
      method: "POST",
      url: `/v1/organizations/${organizationId}/enrollments/${enrollmentId}/activities/${secondActivityId}/attempts`,
      headers: { "x-test-user-id": learnerUserId },
      payload: { submission: { repository: "second-practice" } }
    });
    expect(attempt.statusCode).toBe(201);
    secondAttemptId = (JSON.parse(attempt.body) as { id: string }).id;

    const evidence = await app.inject({
      method: "POST",
      url: `/v1/organizations/${organizationId}/attempts/${secondAttemptId}/evidence`,
      headers: { "x-test-user-id": instructorUserId },
      payload: {
        skillId: secondSkillId,
        kind: "manual-review",
        score: 1
      }
    });
    expect(evidence.statusCode).toBe(201);

    const recommendation = await app.inject({
      method: "GET",
      url: `/v1/organizations/${organizationId}/enrollments/${enrollmentId}/recommendation`,
      headers: { "x-test-user-id": learnerUserId }
    });
    expect(recommendation.statusCode).toBe(200);
    expect(
      nextLearningRecommendationSchema.parse(JSON.parse(recommendation.body))
    ).toMatchObject({
      status: "mastery_target_met",
      enrollmentId,
      recommendation: null
    });

    const enrollment = await migrationPool.query<{ status: string }>(
      `SELECT status
         FROM learning_delivery.enrollments
        WHERE organization_id = $1
          AND id = $2`,
      [organizationId, enrollmentId]
    );
    expect(enrollment.rows[0]?.status).toBe("active");
  });
});
