import { randomUUID } from "node:crypto";

import type { NestFastifyApplication } from "@nestjs/platform-fastify";
import {
  courseRunSchema,
  deliveryGroupSchema,
  groupMembershipSchema,
  groupSetSchema,
  learningOfferingSchema
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
    throw new Error(`${name} is required for delivery-run integration tests.`);
  }
  return value;
}

type IdRow = { id: string };
type EventRow = { event_name: string };

describe("course run and delivery-group HTTP lifecycle", () => {
  const migrationPool = createDatabasePool(
    requireEnv("DATABASE_MIGRATION_URL"),
    { applicationName: "delivery-runs-http-integration-fixtures" }
  );

  let app: NestFastifyApplication;
  let ownerUserId = "";
  let learnerUserId = "";
  let organizationId = "";
  let courseId = "";
  let courseVersionId = "";
  let cohortOfferingId = "";
  let selfPacedOfferingId = "";
  let cohortEnrollmentId = "";
  let selfPacedEnrollmentId = "";
  let courseRunId = "";
  let labSetId = "";
  let discussionSetId = "";
  let labAId = "";
  let labBId = "";
  let discussionAId = "";
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
        "Failed to create delivery-run integration-test identity."
      );
    }
    createdUserIds.push(id);
    return id;
  }

  beforeAll(async () => {
    ownerUserId = await createUser("delivery-run-owner");
    learnerUserId = await createUser("delivery-run-learner");

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
        slug: `delivery-runs-${randomUUID()}`,
        name: "Delivery run integration"
      })
    ).id;

    const invite = await app.inject({
      method: "POST",
      url: `/v1/organizations/${organizationId}/memberships`,
      headers: { "x-test-user-id": ownerUserId },
      payload: { userId: learnerUserId }
    });
    if (invite.statusCode !== 201) {
      throw new Error(`Failed to invite delivery-run learner: ${invite.body}`);
    }

    const accept = await app.inject({
      method: "POST",
      url: `/v1/organizations/${organizationId}/memberships/me/accept`,
      headers: { "x-test-user-id": learnerUserId }
    });
    if (accept.statusCode !== 200) {
      throw new Error(
        `Failed to activate delivery-run learner: ${accept.body}`
      );
    }

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
    if (role.statusCode !== 204) {
      throw new Error(
        `Failed to assign delivery-run learner role: ${role.body}`
      );
    }

    const course = await app.inject({
      method: "POST",
      url: `/v1/organizations/${organizationId}/courses`,
      headers: { "x-test-user-id": ownerUserId },
      payload: {
        slug: `delivery-run-course-${randomUUID()}`,
        title: "Instructor-led delivery"
      }
    });
    if (course.statusCode !== 201) {
      throw new Error(`Failed to create delivery-run course: ${course.body}`);
    }
    const createdCourse = JSON.parse(course.body) as {
      course: { id: string };
      draftVersion: { id: string };
    };
    courseId = createdCourse.course.id;
    courseVersionId = createdCourse.draftVersion.id;

    const publish = await app.inject({
      method: "POST",
      url: `/v1/organizations/${organizationId}/courses/${courseId}/versions/${courseVersionId}/publish`,
      headers: { "x-test-user-id": ownerUserId }
    });
    if (publish.statusCode !== 200) {
      throw new Error(`Failed to publish delivery-run course: ${publish.body}`);
    }

    const cohortOffering = await app.inject({
      method: "POST",
      url: `/v1/organizations/${organizationId}/offerings`,
      headers: { "x-test-user-id": ownerUserId },
      payload: {
        courseVersionId,
        slug: `cohort-${randomUUID()}`,
        name: "Cohort delivery",
        deliveryMode: "cohort",
        startsAt: "2026-09-01T00:00:00.000Z",
        endsAt: "2026-12-31T23:59:59.000Z"
      }
    });
    if (cohortOffering.statusCode !== 201) {
      throw new Error(
        `Failed to create cohort offering: ${cohortOffering.body}`
      );
    }
    cohortOfferingId = learningOfferingSchema.parse(
      JSON.parse(cohortOffering.body)
    ).id;

    const selfPacedOffering = await app.inject({
      method: "POST",
      url: `/v1/organizations/${organizationId}/offerings`,
      headers: { "x-test-user-id": ownerUserId },
      payload: {
        courseVersionId,
        slug: `self-paced-${randomUUID()}`,
        name: "Self-paced delivery",
        deliveryMode: "self_paced"
      }
    });
    if (selfPacedOffering.statusCode !== 201) {
      throw new Error(
        `Failed to create self-paced offering: ${selfPacedOffering.body}`
      );
    }
    selfPacedOfferingId = learningOfferingSchema.parse(
      JSON.parse(selfPacedOffering.body)
    ).id;

    const cohortEnrollment = await app.inject({
      method: "POST",
      url: `/v1/organizations/${organizationId}/offerings/${cohortOfferingId}/enrollments`,
      headers: { "x-test-user-id": ownerUserId },
      payload: { userId: learnerUserId }
    });
    if (cohortEnrollment.statusCode !== 201) {
      throw new Error(
        `Failed to create cohort enrollment: ${cohortEnrollment.body}`
      );
    }
    cohortEnrollmentId = (JSON.parse(cohortEnrollment.body) as { id: string })
      .id;

    const selfPacedEnrollment = await app.inject({
      method: "POST",
      url: `/v1/organizations/${organizationId}/offerings/${selfPacedOfferingId}/enrollments`,
      headers: { "x-test-user-id": ownerUserId },
      payload: { userId: learnerUserId }
    });
    if (selfPacedEnrollment.statusCode !== 201) {
      throw new Error(
        `Failed to create self-paced enrollment: ${selfPacedEnrollment.body}`
      );
    }
    selfPacedEnrollmentId = (
      JSON.parse(selfPacedEnrollment.body) as { id: string }
    ).id;
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
        `DELETE FROM learning_delivery.group_memberships WHERE organization_id = $1`,
        [organizationId]
      );
      await migrationPool.query(
        `DELETE FROM learning_delivery.groups WHERE organization_id = $1`,
        [organizationId]
      );
      await migrationPool.query(
        `DELETE FROM learning_delivery.group_sets WHERE organization_id = $1`,
        [organizationId]
      );
      await migrationPool.query(
        `DELETE FROM learning_delivery.course_runs WHERE organization_id = $1`,
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

  it("keeps self-paced delivery runless at the application and database boundaries", async () => {
    const response = await app.inject({
      method: "POST",
      url: `/v1/organizations/${organizationId}/offerings/${selfPacedOfferingId}/runs`,
      headers: { "x-test-user-id": ownerUserId },
      payload: {
        slug: "invalid-self-paced-run",
        name: "Invalid self-paced run",
        startsAt: "2026-09-15T09:00:00.000Z",
        endsAt: "2026-10-15T09:00:00.000Z"
      }
    });
    expect(response.statusCode).toBe(409);

    await expect(
      migrationPool.query(
        `INSERT INTO learning_delivery.course_runs
           (organization_id, offering_id, slug, name, starts_at, ends_at, created_by_user_id)
         VALUES ($1, $2, $3, $4, $5::timestamptz, $6::timestamptz, $7)`,
        [
          organizationId,
          selfPacedOfferingId,
          `db-invalid-${randomUUID()}`,
          "Database invalid run",
          "2026-09-15T09:00:00.000Z",
          "2026-10-15T09:00:00.000Z",
          ownerUserId
        ]
      )
    ).rejects.toMatchObject({ code: "23514" });
  });

  it("does not let a learner manage cohort execution", async () => {
    const response = await app.inject({
      method: "POST",
      url: `/v1/organizations/${organizationId}/offerings/${cohortOfferingId}/runs`,
      headers: { "x-test-user-id": learnerUserId },
      payload: {
        slug: "learner-created",
        name: "Learner-created run",
        startsAt: "2026-09-15T09:00:00.000Z",
        endsAt: "2026-12-15T09:00:00.000Z"
      }
    });
    expect(response.statusCode).toBe(403);
  });

  it("creates a concrete cohort run inside the offering schedule", async () => {
    const response = await app.inject({
      method: "POST",
      url: `/v1/organizations/${organizationId}/offerings/${cohortOfferingId}/runs`,
      headers: { "x-test-user-id": ownerUserId },
      payload: {
        slug: "fall-2026-a",
        name: "Fall 2026 A",
        startsAt: "2026-09-15T09:00:00.000Z",
        endsAt: "2026-12-15T09:00:00.000Z"
      }
    });

    expect(response.statusCode).toBe(201);
    const courseRun = courseRunSchema.parse(JSON.parse(response.body));
    courseRunId = courseRun.id;
    expect(courseRun).toMatchObject({
      organizationId,
      offeringId: cohortOfferingId,
      slug: "fall-2026-a"
    });

    const read = await app.inject({
      method: "GET",
      url: `/v1/organizations/${organizationId}/offerings/${cohortOfferingId}/runs/${courseRunId}`,
      headers: { "x-test-user-id": learnerUserId }
    });
    expect(read.statusCode).toBe(200);
    expect(courseRunSchema.parse(JSON.parse(read.body)).id).toBe(courseRunId);
  });

  it("rejects a course run outside its offering schedule", async () => {
    const response = await app.inject({
      method: "POST",
      url: `/v1/organizations/${organizationId}/offerings/${cohortOfferingId}/runs`,
      headers: { "x-test-user-id": ownerUserId },
      payload: {
        slug: "outside-window",
        name: "Outside window",
        startsAt: "2026-08-20T09:00:00.000Z",
        endsAt: "2026-12-15T09:00:00.000Z"
      }
    });
    expect(response.statusCode).toBe(409);
  });

  it("creates independent group sets and groups inside the run", async () => {
    const labs = await app.inject({
      method: "POST",
      url: `/v1/organizations/${organizationId}/offerings/${cohortOfferingId}/runs/${courseRunId}/group-sets`,
      headers: { "x-test-user-id": ownerUserId },
      payload: { slug: "labs", name: "Lab sections" }
    });
    expect(labs.statusCode).toBe(201);
    labSetId = groupSetSchema.parse(JSON.parse(labs.body)).id;

    const discussions = await app.inject({
      method: "POST",
      url: `/v1/organizations/${organizationId}/offerings/${cohortOfferingId}/runs/${courseRunId}/group-sets`,
      headers: { "x-test-user-id": ownerUserId },
      payload: { slug: "discussions", name: "Discussion sections" }
    });
    expect(discussions.statusCode).toBe(201);
    discussionSetId = groupSetSchema.parse(JSON.parse(discussions.body)).id;

    const labA = await app.inject({
      method: "POST",
      url: `/v1/organizations/${organizationId}/offerings/${cohortOfferingId}/runs/${courseRunId}/group-sets/${labSetId}/groups`,
      headers: { "x-test-user-id": ownerUserId },
      payload: { slug: "lab-a", name: "Lab A" }
    });
    expect(labA.statusCode).toBe(201);
    labAId = deliveryGroupSchema.parse(JSON.parse(labA.body)).id;

    const labB = await app.inject({
      method: "POST",
      url: `/v1/organizations/${organizationId}/offerings/${cohortOfferingId}/runs/${courseRunId}/group-sets/${labSetId}/groups`,
      headers: { "x-test-user-id": ownerUserId },
      payload: { slug: "lab-b", name: "Lab B" }
    });
    expect(labB.statusCode).toBe(201);
    labBId = deliveryGroupSchema.parse(JSON.parse(labB.body)).id;

    const discussionA = await app.inject({
      method: "POST",
      url: `/v1/organizations/${organizationId}/offerings/${cohortOfferingId}/runs/${courseRunId}/group-sets/${discussionSetId}/groups`,
      headers: { "x-test-user-id": ownerUserId },
      payload: { slug: "discussion-a", name: "Discussion A" }
    });
    expect(discussionA.statusCode).toBe(201);
    discussionAId = deliveryGroupSchema.parse(JSON.parse(discussionA.body)).id;
  });

  it("uses enrollment as the group-membership prerequisite", async () => {
    const first = await app.inject({
      method: "POST",
      url: `/v1/organizations/${organizationId}/offerings/${cohortOfferingId}/runs/${courseRunId}/group-sets/${labSetId}/groups/${labAId}/memberships`,
      headers: { "x-test-user-id": ownerUserId },
      payload: { enrollmentId: cohortEnrollmentId }
    });
    expect(first.statusCode).toBe(201);
    expect(groupMembershipSchema.parse(JSON.parse(first.body))).toMatchObject({
      groupSetId: labSetId,
      groupId: labAId,
      enrollmentId: cohortEnrollmentId,
      endedAt: null
    });

    const competingLab = await app.inject({
      method: "POST",
      url: `/v1/organizations/${organizationId}/offerings/${cohortOfferingId}/runs/${courseRunId}/group-sets/${labSetId}/groups/${labBId}/memberships`,
      headers: { "x-test-user-id": ownerUserId },
      payload: { enrollmentId: cohortEnrollmentId }
    });
    expect(competingLab.statusCode).toBe(409);

    const discussion = await app.inject({
      method: "POST",
      url: `/v1/organizations/${organizationId}/offerings/${cohortOfferingId}/runs/${courseRunId}/group-sets/${discussionSetId}/groups/${discussionAId}/memberships`,
      headers: { "x-test-user-id": ownerUserId },
      payload: { enrollmentId: cohortEnrollmentId }
    });
    expect(discussion.statusCode).toBe(201);
  });

  it("cannot place an enrollment from another offering into the run", async () => {
    const response = await app.inject({
      method: "POST",
      url: `/v1/organizations/${organizationId}/offerings/${cohortOfferingId}/runs/${courseRunId}/group-sets/${labSetId}/groups/${labBId}/memberships`,
      headers: { "x-test-user-id": ownerUserId },
      payload: { enrollmentId: selfPacedEnrollmentId }
    });
    expect(response.statusCode).toBe(409);

    await expect(
      migrationPool.query(
        `INSERT INTO learning_delivery.group_memberships
           (organization_id, group_set_id, group_id, enrollment_id, assigned_by_user_id)
         VALUES ($1, $2, $3, $4, $5)`,
        [organizationId, labSetId, labBId, selfPacedEnrollmentId, ownerUserId]
      )
    ).rejects.toMatchObject({ code: "23514" });
  });

  it("records delivery-structure mutations in the transactional outbox", async () => {
    const result = await migrationPool.query<EventRow>(
      `SELECT event_name
         FROM events.outbox
        WHERE organization_id = $1
          AND event_name IN (
            'course_run.created',
            'group_set.created',
            'group.created',
            'group_membership.assigned'
          )`,
      [organizationId]
    );
    const names = result.rows.map((row) => row.event_name);

    expect(names).toContain("course_run.created");
    expect(names.filter((name) => name === "group_set.created")).toHaveLength(
      2
    );
    expect(names.filter((name) => name === "group.created")).toHaveLength(3);
    expect(
      names.filter((name) => name === "group_membership.assigned")
    ).toHaveLength(2);
  });
});
