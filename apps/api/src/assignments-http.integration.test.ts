import { randomUUID } from "node:crypto";

import type { NestFastifyApplication } from "@nestjs/platform-fastify";
import { assignmentSchema, type AssignmentAudience } from "@platform/contracts";
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
    throw new Error(`${name} is required for assignment integration tests.`);
  }
  return value;
}

type IdRow = { id: string };
type PublishedActivityFixture = Readonly<{
  courseId: string;
  courseVersionId: string;
  activityId: string;
  activityVersionId: string;
}>;

describe("assignment HTTP lifecycle", () => {
  let migrationPool: DatabasePool;
  let appPool: DatabasePool;
  let app: NestFastifyApplication;
  let ownerUserId = "";
  let learnerUserId = "";
  let organizationId = "";
  let isolationOrganizationId = "";
  let primaryActivity: PublishedActivityFixture;
  let foreignActivity: PublishedActivityFixture;
  let selfPacedOfferingId = "";
  let cohortOfferingId = "";
  let foreignOfferingId = "";
  let cohortEnrollmentId = "";
  let foreignEnrollmentId = "";
  let courseRunId = "";
  let foreignCourseRunId = "";
  let groupId = "";
  let foreignGroupId = "";
  let offeringAssignmentId = "";
  let groupAssignmentId = "";
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
      throw new Error("Failed to create assignment integration-test identity.");
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
    if (invite.statusCode !== 201) {
      throw new Error(`Failed to invite assignment learner: ${invite.body}`);
    }

    const accept = await app.inject({
      method: "POST",
      url: `/v1/organizations/${organizationId}/memberships/me/accept`,
      headers: { "x-test-user-id": userId }
    });
    if (accept.statusCode !== 200) {
      throw new Error(`Failed to activate assignment learner: ${accept.body}`);
    }

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
    if (role.statusCode !== 204) {
      throw new Error(`Failed to assign learner role: ${role.body}`);
    }
  }

  async function createPublishedActivity(label: string): Promise<PublishedActivityFixture> {
    const skill = await app.inject({
      method: "POST",
      url: `/v1/organizations/${organizationId}/skills`,
      headers: { "x-test-user-id": ownerUserId },
      payload: {
        key: `${label}-${randomUUID()}`,
        title: `${label} skill`
      }
    });
    if (skill.statusCode !== 201) {
      throw new Error(`Failed to create ${label} skill: ${skill.body}`);
    }
    const skillId = (JSON.parse(skill.body) as { id: string }).id;

    const course = await app.inject({
      method: "POST",
      url: `/v1/organizations/${organizationId}/courses`,
      headers: { "x-test-user-id": ownerUserId },
      payload: {
        slug: `${label}-${randomUUID()}`,
        title: `${label} course`
      }
    });
    if (course.statusCode !== 201) {
      throw new Error(`Failed to create ${label} course: ${course.body}`);
    }
    const created = JSON.parse(course.body) as {
      course: { id: string };
      draftVersion: { id: string };
    };

    const attach = await app.inject({
      method: "POST",
      url: `/v1/organizations/${organizationId}/courses/${created.course.id}/versions/${created.draftVersion.id}/skills`,
      headers: { "x-test-user-id": ownerUserId },
      payload: { skillId }
    });
    if (attach.statusCode !== 201) {
      throw new Error(`Failed to attach ${label} skill: ${attach.body}`);
    }

    const activity = await app.inject({
      method: "POST",
      url: `/v1/organizations/${organizationId}/courses/${created.course.id}/versions/${created.draftVersion.id}/activities`,
      headers: { "x-test-user-id": ownerUserId },
      payload: {
        slug: `${label}-activity`,
        activityType: "foundation.assignment-test",
        title: `${label} activity`,
        skillIds: [skillId]
      }
    });
    if (activity.statusCode !== 201) {
      throw new Error(`Failed to create ${label} activity: ${activity.body}`);
    }
    const createdActivity = JSON.parse(activity.body) as {
      id: string;
      activityId: string;
    };

    const publish = await app.inject({
      method: "POST",
      url: `/v1/organizations/${organizationId}/courses/${created.course.id}/versions/${created.draftVersion.id}/publish`,
      headers: { "x-test-user-id": ownerUserId }
    });
    if (publish.statusCode !== 200) {
      throw new Error(`Failed to publish ${label} course: ${publish.body}`);
    }

    return {
      courseId: created.course.id,
      courseVersionId: created.draftVersion.id,
      activityId: createdActivity.activityId,
      activityVersionId: createdActivity.id
    };
  }

  async function createOffering(
    deliveryMode: "self_paced" | "cohort",
    label: string
  ): Promise<string> {
    const response = await app.inject({
      method: "POST",
      url: `/v1/organizations/${organizationId}/offerings`,
      headers: { "x-test-user-id": ownerUserId },
      payload: {
        courseVersionId: primaryActivity.courseVersionId,
        slug: `${label}-${randomUUID()}`,
        name: label,
        deliveryMode,
        ...(deliveryMode === "cohort"
          ? {
              startsAt: "2099-02-01T00:00:00.000Z",
              endsAt: "2099-11-30T23:59:59.000Z"
            }
          : {})
      }
    });
    if (response.statusCode !== 201) {
      throw new Error(`Failed to create ${label} offering: ${response.body}`);
    }
    return (JSON.parse(response.body) as { id: string }).id;
  }

  async function createEnrollment(offeringId: string): Promise<string> {
    const response = await app.inject({
      method: "POST",
      url: `/v1/organizations/${organizationId}/offerings/${offeringId}/enrollments`,
      headers: { "x-test-user-id": ownerUserId },
      payload: { userId: learnerUserId }
    });
    if (response.statusCode !== 201) {
      throw new Error(`Failed to create assignment enrollment: ${response.body}`);
    }
    return (JSON.parse(response.body) as { id: string }).id;
  }

  async function createRun(offeringId: string, label: string): Promise<string> {
    const response = await app.inject({
      method: "POST",
      url: `/v1/organizations/${organizationId}/offerings/${offeringId}/runs`,
      headers: { "x-test-user-id": ownerUserId },
      payload: {
        slug: `${label}-${randomUUID()}`,
        name: label,
        startsAt: "2099-03-01T00:00:00.000Z",
        endsAt: "2099-10-31T23:59:59.000Z"
      }
    });
    if (response.statusCode !== 201) {
      throw new Error(`Failed to create ${label} run: ${response.body}`);
    }
    return (JSON.parse(response.body) as { id: string }).id;
  }

  async function createGroup(
    offeringId: string,
    runId: string,
    label: string
  ): Promise<string> {
    const groupSet = await app.inject({
      method: "POST",
      url: `/v1/organizations/${organizationId}/offerings/${offeringId}/runs/${runId}/group-sets`,
      headers: { "x-test-user-id": ownerUserId },
      payload: { slug: `${label}-set-${randomUUID()}`, name: `${label} set` }
    });
    if (groupSet.statusCode !== 201) {
      throw new Error(`Failed to create ${label} group set: ${groupSet.body}`);
    }
    const groupSetId = (JSON.parse(groupSet.body) as { id: string }).id;

    const group = await app.inject({
      method: "POST",
      url: `/v1/organizations/${organizationId}/offerings/${offeringId}/runs/${runId}/group-sets/${groupSetId}/groups`,
      headers: { "x-test-user-id": ownerUserId },
      payload: { slug: `${label}-${randomUUID()}`, name: label }
    });
    if (group.statusCode !== 201) {
      throw new Error(`Failed to create ${label} group: ${group.body}`);
    }
    return (JSON.parse(group.body) as { id: string }).id;
  }

  async function createAssignment(
    offeringId: string,
    slug: string,
    audience: AssignmentAudience,
    schedule?: Readonly<{ availableAt: string; dueAt: string }>
  ) {
    return app.inject({
      method: "POST",
      url: `/v1/organizations/${organizationId}/offerings/${offeringId}/assignments`,
      headers: { "x-test-user-id": ownerUserId },
      payload: {
        activityId: primaryActivity.activityId,
        slug,
        name: slug,
        audience,
        ...schedule
      }
    });
  }

  beforeAll(async () => {
    migrationPool = createDatabasePool(requireEnv("DATABASE_MIGRATION_URL"), {
      applicationName: "assignments-http-integration-fixtures"
    });
    appPool = createDatabasePool(requireEnv("DATABASE_URL"), {
      applicationName: "assignments-http-integration-app"
    });

    ownerUserId = await createUser("assignment-owner");
    learnerUserId = await createUser("assignment-learner");

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
        slug: `assignments-${randomUUID()}`,
        name: "Assignment integration"
      }
    });
    if (organization.statusCode !== 201) {
      throw new Error(`Failed to create assignment organization: ${organization.body}`);
    }
    organizationId = (JSON.parse(organization.body) as { id: string }).id;

    await activateLearner(learnerUserId);
    primaryActivity = await createPublishedActivity("primary-assignment");
    foreignActivity = await createPublishedActivity("foreign-assignment");

    selfPacedOfferingId = await createOffering("self_paced", "Self paced assignments");
    cohortOfferingId = await createOffering("cohort", "Cohort assignments");
    foreignOfferingId = await createOffering("cohort", "Foreign cohort assignments");

    cohortEnrollmentId = await createEnrollment(cohortOfferingId);
    foreignEnrollmentId = await createEnrollment(foreignOfferingId);
    courseRunId = await createRun(cohortOfferingId, "Primary assignment run");
    foreignCourseRunId = await createRun(foreignOfferingId, "Foreign assignment run");
    groupId = await createGroup(cohortOfferingId, courseRunId, "Primary assignment group");
    foreignGroupId = await createGroup(
      foreignOfferingId,
      foreignCourseRunId,
      "Foreign assignment group"
    );

    const isolation = await app.inject({
      method: "POST",
      url: "/v1/organizations",
      headers: { "x-test-user-id": ownerUserId },
      payload: {
        slug: `assignment-isolation-${randomUUID()}`,
        name: "Assignment RLS isolation"
      }
    });
    if (isolation.statusCode !== 201) {
      throw new Error(`Failed to create isolation organization: ${isolation.body}`);
    }
    isolationOrganizationId = (JSON.parse(isolation.body) as { id: string }).id;
  });

  afterAll(async () => {
    if (app !== undefined) {
      await app.close();
    }

    if (organizationId.length > 0) {
      await migrationPool.query(`DELETE FROM events.outbox WHERE organization_id = $1`, [organizationId]);
      await migrationPool.query(`DELETE FROM learning_delivery.assignments WHERE organization_id = $1`, [organizationId]);
      await migrationPool.query(`DELETE FROM learning_delivery.group_memberships WHERE organization_id = $1`, [organizationId]);
      await migrationPool.query(`DELETE FROM learning_delivery.groups WHERE organization_id = $1`, [organizationId]);
      await migrationPool.query(`DELETE FROM learning_delivery.group_sets WHERE organization_id = $1`, [organizationId]);
      await migrationPool.query(`DELETE FROM learning_delivery.course_runs WHERE organization_id = $1`, [organizationId]);
      await migrationPool.query(`DELETE FROM learning_delivery.enrollments WHERE organization_id = $1`, [organizationId]);
      await migrationPool.query(`DELETE FROM learning_delivery.learning_offerings WHERE organization_id = $1`, [organizationId]);
      await migrationPool.query(`DELETE FROM learning_content.activity_skill_mappings WHERE organization_id = $1`, [organizationId]);
      await migrationPool.query(`DELETE FROM learning_content.course_version_activities WHERE organization_id = $1`, [organizationId]);
      await migrationPool.query(`DELETE FROM learning_content.course_version_skills WHERE organization_id = $1`, [organizationId]);
      await migrationPool.query(`DELETE FROM learning_content.activities WHERE organization_id = $1`, [organizationId]);
      await migrationPool.query(`DELETE FROM learning_content.skills WHERE organization_id = $1`, [organizationId]);
      await migrationPool.query(`DELETE FROM learning_content.courses WHERE organization_id = $1`, [organizationId]);
      await migrationPool.query(`DELETE FROM organizations.organizations WHERE id = $1`, [organizationId]);
    }

    if (isolationOrganizationId.length > 0) {
      await migrationPool.query(`DELETE FROM events.outbox WHERE organization_id = $1`, [isolationOrganizationId]);
      await migrationPool.query(`DELETE FROM organizations.organizations WHERE id = $1`, [isolationOrganizationId]);
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

  it("creates one assignment model across self-paced and cohort audiences", async () => {
    const offeringAssignment = await createAssignment(
      selfPacedOfferingId,
      "self-paced-homework",
      { type: "offering" },
      {
        availableAt: "2099-01-01T00:00:00.000Z",
        dueAt: "2099-12-31T23:59:59.000Z"
      }
    );
    expect(offeringAssignment.statusCode).toBe(201);
    const offeringBody = assignmentSchema.parse(JSON.parse(offeringAssignment.body));
    offeringAssignmentId = offeringBody.id;
    expect(offeringBody.activityVersionId).toBe(primaryActivity.activityVersionId);
    expect(offeringBody.audience).toEqual({ type: "offering" });

    const runAssignment = await createAssignment(
      cohortOfferingId,
      "run-homework",
      { type: "course_run", courseRunId },
      {
        availableAt: "2099-01-15T00:00:00.000Z",
        dueAt: "2099-12-15T00:00:00.000Z"
      }
    );
    expect(runAssignment.statusCode).toBe(201);
    expect(assignmentSchema.parse(JSON.parse(runAssignment.body)).audience).toEqual({
      type: "course_run",
      courseRunId
    });

    const groupAssignment = await createAssignment(
      cohortOfferingId,
      "group-homework",
      { type: "group", groupId }
    );
    expect(groupAssignment.statusCode).toBe(201);
    const groupBody = assignmentSchema.parse(JSON.parse(groupAssignment.body));
    groupAssignmentId = groupBody.id;
    expect(groupBody.audience).toEqual({ type: "group", groupId });

    const enrollmentAssignment = await createAssignment(
      cohortOfferingId,
      "individual-homework",
      { type: "enrollment", enrollmentId: cohortEnrollmentId }
    );
    expect(enrollmentAssignment.statusCode).toBe(201);
    expect(assignmentSchema.parse(JSON.parse(enrollmentAssignment.body)).audience).toEqual({
      type: "enrollment",
      enrollmentId: cohortEnrollmentId
    });

    const learnerRead = await app.inject({
      method: "GET",
      url: `/v1/organizations/${organizationId}/offerings/${cohortOfferingId}/assignments/${groupAssignmentId}`,
      headers: { "x-test-user-id": learnerUserId }
    });
    expect(learnerRead.statusCode).toBe(403);
  });

  it("rejects Activity or audience targets outside the parent Offering", async () => {
    const foreignActivityResponse = await app.inject({
      method: "POST",
      url: `/v1/organizations/${organizationId}/offerings/${cohortOfferingId}/assignments`,
      headers: { "x-test-user-id": ownerUserId },
      payload: {
        activityId: foreignActivity.activityId,
        slug: "wrong-activity",
        name: "Wrong activity",
        audience: { type: "offering" }
      }
    });
    expect(foreignActivityResponse.statusCode).toBe(404);

    const foreignRun = await createAssignment(
      cohortOfferingId,
      "wrong-run",
      { type: "course_run", courseRunId: foreignCourseRunId }
    );
    expect(foreignRun.statusCode).toBe(404);

    const foreignGroup = await createAssignment(
      cohortOfferingId,
      "wrong-group",
      { type: "group", groupId: foreignGroupId }
    );
    expect(foreignGroup.statusCode).toBe(404);

    const foreignEnrollment = await createAssignment(
      cohortOfferingId,
      "wrong-enrollment",
      { type: "enrollment", enrollmentId: foreignEnrollmentId }
    );
    expect(foreignEnrollment.statusCode).toBe(404);
  });

  it("enforces the same scope invariants in PostgreSQL", async () => {
    await expect(
      migrationPool.query(
        `INSERT INTO learning_delivery.assignments
           (organization_id, offering_id, activity_version_id, slug, name,
            audience_type, course_run_id, created_by_user_id)
         VALUES ($1, $2, $3, $4, 'Cross offering run', 'course_run', $5, $6)`,
        [
          organizationId,
          cohortOfferingId,
          primaryActivity.activityVersionId,
          `cross-run-${randomUUID()}`,
          foreignCourseRunId,
          ownerUserId
        ]
      )
    ).rejects.toMatchObject({ code: "23514" });

    await expect(
      migrationPool.query(
        `INSERT INTO learning_delivery.assignments
           (organization_id, offering_id, activity_version_id, slug, name,
            audience_type, created_by_user_id)
         VALUES ($1, $2, $3, $4, 'Wrong course version', 'offering', $5)`,
        [
          organizationId,
          cohortOfferingId,
          foreignActivity.activityVersionId,
          `cross-activity-${randomUUID()}`,
          ownerUserId
        ]
      )
    ).rejects.toMatchObject({ code: "23514" });

    await expect(
      migrationPool.query(
        `INSERT INTO learning_delivery.assignments
           (organization_id, offering_id, activity_version_id, slug, name,
            audience_type, group_id, created_by_user_id)
         VALUES ($1, $2, $3, $4, 'Invalid audience shape', 'offering', $5, $6)`,
        [
          organizationId,
          cohortOfferingId,
          primaryActivity.activityVersionId,
          `invalid-shape-${randomUUID()}`,
          groupId,
          ownerUserId
        ]
      )
    ).rejects.toMatchObject({ code: "23514" });
  });

  it("keeps assignment history immutable and cancellation one-way", async () => {
    await expect(
      withTenantTransaction(
        appPool,
        { organizationId, userId: ownerUserId },
        async ({ client }) =>
          client.query(
            `UPDATE learning_delivery.assignments
                SET name = 'Rewritten assignment'
              WHERE organization_id = $1 AND id = $2`,
            [organizationId, groupAssignmentId]
          )
      )
    ).rejects.toMatchObject({ code: "42501" });

    await expect(
      withTenantTransaction(
        appPool,
        { organizationId, userId: ownerUserId },
        async ({ client }) =>
          client.query(
            `UPDATE learning_delivery.assignments
                SET cancelled_at = now(), cancelled_by_user_id = $1
              WHERE organization_id = $2 AND id = $3`,
            [learnerUserId, organizationId, groupAssignmentId]
          )
      )
    ).rejects.toMatchObject({ code: "55000" });

    const cancel = await app.inject({
      method: "POST",
      url: `/v1/organizations/${organizationId}/offerings/${selfPacedOfferingId}/assignments/${offeringAssignmentId}/cancel`,
      headers: { "x-test-user-id": ownerUserId }
    });
    expect(cancel.statusCode).toBe(200);
    const cancelled = assignmentSchema.parse(JSON.parse(cancel.body));
    expect(cancelled.cancelledAt).not.toBeNull();

    const repeat = await app.inject({
      method: "POST",
      url: `/v1/organizations/${organizationId}/offerings/${selfPacedOfferingId}/assignments/${offeringAssignmentId}/cancel`,
      headers: { "x-test-user-id": ownerUserId }
    });
    expect(repeat.statusCode).toBe(200);
    expect(assignmentSchema.parse(JSON.parse(repeat.body)).cancelledAt).toBe(
      cancelled.cancelledAt
    );

    await expect(
      withTenantTransaction(
        appPool,
        { organizationId, userId: ownerUserId },
        async ({ client }) =>
          client.query(
            `UPDATE learning_delivery.assignments
                SET cancelled_at = NULL, cancelled_by_user_id = NULL
              WHERE organization_id = $1 AND id = $2`,
            [organizationId, offeringAssignmentId]
          )
      )
    ).rejects.toMatchObject({ code: "55000" });

    await expect(
      withTenantTransaction(
        appPool,
        { organizationId, userId: ownerUserId },
        async ({ client }) =>
          client.query(
            `DELETE FROM learning_delivery.assignments
              WHERE organization_id = $1 AND id = $2`,
            [organizationId, groupAssignmentId]
          )
      )
    ).rejects.toMatchObject({ code: "42501" });

    const events = await migrationPool.query<{ event_name: string }>(
      `SELECT event_name
         FROM events.outbox
        WHERE organization_id = $1
          AND aggregate_type = 'assignment'
          AND aggregate_id = $2
        ORDER BY created_at, id`,
      [organizationId, offeringAssignmentId]
    );
    expect(events.rows.map((row) => row.event_name)).toEqual([
      "assignment.created",
      "assignment.cancelled"
    ]);
  });

  it("isolates Assignment rows with tenant RLS", async () => {
    const visible = await withTenantTransaction(
      appPool,
      { organizationId: isolationOrganizationId, userId: ownerUserId },
      async ({ client }) =>
        client.query<{ id: string }>(
          `SELECT id::text
             FROM learning_delivery.assignments
            WHERE id = $1`,
          [groupAssignmentId]
        )
    );
    expect(visible.rows).toHaveLength(0);
  });
});
