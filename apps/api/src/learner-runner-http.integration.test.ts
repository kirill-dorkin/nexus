import { randomUUID } from "node:crypto";

import type { NestFastifyApplication } from "@nestjs/platform-fastify";
import {
  attemptSchema,
  learnerRunnerReadModelSchema,
  type AssignmentAudience
} from "@platform/contracts";
import { createDatabasePool, type DatabasePool } from "@platform/database";
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
    throw new Error(`${name} is required for learner-runner integration tests.`);
  }
  return value;
}

type IdRow = { id: string };
type ActivityFixture = Readonly<{
  activityId: string;
  activityVersionId: string;
}>;
type PublishedCourseFixture = Readonly<{
  courseVersionId: string;
  assignedActivity: ActivityFixture;
  unassignedActivity: ActivityFixture;
}>;
type GroupFixture = Readonly<{
  groupSetId: string;
  groupId: string;
}>;

describe("learner runner effective assignments", () => {
  let migrationPool: DatabasePool;
  let app: NestFastifyApplication;
  let ownerUserId = "";
  let learnerUserId = "";
  let otherLearnerUserId = "";
  let organizationId = "";
  let course: PublishedCourseFixture;
  let offeringId = "";
  let enrollmentId = "";
  let otherEnrollmentId = "";
  let primaryRunId = "";
  let otherRunId = "";
  let primaryGroup: GroupFixture;
  let otherGroup: GroupFixture;
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
      throw new Error("Failed to create learner-runner test identity.");
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
      throw new Error(`Failed to invite runner learner: ${invite.body}`);
    }

    const accept = await app.inject({
      method: "POST",
      url: `/v1/organizations/${organizationId}/memberships/me/accept`,
      headers: { "x-test-user-id": userId }
    });
    if (accept.statusCode !== 200) {
      throw new Error(`Failed to activate runner learner: ${accept.body}`);
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
      throw new Error(`Failed to assign runner learner role: ${role.body}`);
    }
  }

  async function createPublishedCourse(): Promise<PublishedCourseFixture> {
    const skill = await app.inject({
      method: "POST",
      url: `/v1/organizations/${organizationId}/skills`,
      headers: { "x-test-user-id": ownerUserId },
      payload: {
        key: `runner-skill-${randomUUID()}`,
        title: "Runner skill"
      }
    });
    if (skill.statusCode !== 201) {
      throw new Error(`Failed to create runner skill: ${skill.body}`);
    }
    const skillId = (JSON.parse(skill.body) as { id: string }).id;

    const courseResponse = await app.inject({
      method: "POST",
      url: `/v1/organizations/${organizationId}/courses`,
      headers: { "x-test-user-id": ownerUserId },
      payload: {
        slug: `runner-course-${randomUUID()}`,
        title: "Runner course"
      }
    });
    if (courseResponse.statusCode !== 201) {
      throw new Error(`Failed to create runner course: ${courseResponse.body}`);
    }
    const created = JSON.parse(courseResponse.body) as {
      course: { id: string };
      draftVersion: { id: string };
    };

    const attachSkill = await app.inject({
      method: "POST",
      url: `/v1/organizations/${organizationId}/courses/${created.course.id}/versions/${created.draftVersion.id}/skills`,
      headers: { "x-test-user-id": ownerUserId },
      payload: { skillId }
    });
    if (attachSkill.statusCode !== 201) {
      throw new Error(`Failed to attach runner skill: ${attachSkill.body}`);
    }

    const createActivity = async (slug: string): Promise<ActivityFixture> => {
      const response = await app.inject({
        method: "POST",
        url: `/v1/organizations/${organizationId}/courses/${created.course.id}/versions/${created.draftVersion.id}/activities`,
        headers: { "x-test-user-id": ownerUserId },
        payload: {
          slug,
          activityType: "foundation.runner-test",
          title: slug,
          skillIds: [skillId]
        }
      });
      if (response.statusCode !== 201) {
        throw new Error(`Failed to create ${slug}: ${response.body}`);
      }
      const body = JSON.parse(response.body) as { id: string; activityId: string };
      return {
        activityId: body.activityId,
        activityVersionId: body.id
      };
    };

    const assignedActivity = await createActivity("assigned-activity");
    const unassignedActivity = await createActivity("unassigned-activity");

    const publish = await app.inject({
      method: "POST",
      url: `/v1/organizations/${organizationId}/courses/${created.course.id}/versions/${created.draftVersion.id}/publish`,
      headers: { "x-test-user-id": ownerUserId }
    });
    if (publish.statusCode !== 200) {
      throw new Error(`Failed to publish runner course: ${publish.body}`);
    }

    return {
      courseVersionId: created.draftVersion.id,
      assignedActivity,
      unassignedActivity
    };
  }

  async function createEnrollment(userId: string): Promise<string> {
    const response = await app.inject({
      method: "POST",
      url: `/v1/organizations/${organizationId}/offerings/${offeringId}/enrollments`,
      headers: { "x-test-user-id": ownerUserId },
      payload: { userId }
    });
    if (response.statusCode !== 201) {
      throw new Error(`Failed to create runner enrollment: ${response.body}`);
    }
    return (JSON.parse(response.body) as { id: string }).id;
  }

  async function createRun(label: string): Promise<string> {
    const response = await app.inject({
      method: "POST",
      url: `/v1/organizations/${organizationId}/offerings/${offeringId}/runs`,
      headers: { "x-test-user-id": ownerUserId },
      payload: {
        slug: `${label}-${randomUUID()}`,
        name: label,
        startsAt: "2026-01-01T00:00:00.000Z",
        endsAt: "2099-12-31T23:59:59.000Z"
      }
    });
    if (response.statusCode !== 201) {
      throw new Error(`Failed to create ${label}: ${response.body}`);
    }
    return (JSON.parse(response.body) as { id: string }).id;
  }

  async function createGroup(runId: string, label: string): Promise<GroupFixture> {
    const groupSet = await app.inject({
      method: "POST",
      url: `/v1/organizations/${organizationId}/offerings/${offeringId}/runs/${runId}/group-sets`,
      headers: { "x-test-user-id": ownerUserId },
      payload: {
        slug: `${label}-set-${randomUUID()}`,
        name: `${label} set`
      }
    });
    if (groupSet.statusCode !== 201) {
      throw new Error(`Failed to create ${label} group set: ${groupSet.body}`);
    }
    const groupSetId = (JSON.parse(groupSet.body) as { id: string }).id;

    const group = await app.inject({
      method: "POST",
      url: `/v1/organizations/${organizationId}/offerings/${offeringId}/runs/${runId}/group-sets/${groupSetId}/groups`,
      headers: { "x-test-user-id": ownerUserId },
      payload: {
        slug: `${label}-group-${randomUUID()}`,
        name: `${label} group`
      }
    });
    if (group.statusCode !== 201) {
      throw new Error(`Failed to create ${label} group: ${group.body}`);
    }

    return {
      groupSetId,
      groupId: (JSON.parse(group.body) as { id: string }).id
    };
  }

  async function createAssignment(
    slug: string,
    audience: AssignmentAudience,
    schedule?: Readonly<{ availableAt: string; dueAt: string }>
  ): Promise<string> {
    const response = await app.inject({
      method: "POST",
      url: `/v1/organizations/${organizationId}/offerings/${offeringId}/assignments`,
      headers: { "x-test-user-id": ownerUserId },
      payload: {
        activityId: course.assignedActivity.activityId,
        slug,
        name: slug,
        audience,
        ...schedule
      }
    });
    if (response.statusCode !== 201) {
      throw new Error(`Failed to create ${slug}: ${response.body}`);
    }
    return (JSON.parse(response.body) as { id: string }).id;
  }

  beforeAll(async () => {
    migrationPool = createDatabasePool(requireEnv("DATABASE_MIGRATION_URL"), {
      applicationName: "learner-runner-http-integration-fixtures"
    });

    ownerUserId = await createUser("runner-owner");
    learnerUserId = await createUser("runner-learner");
    otherLearnerUserId = await createUser("runner-other-learner");

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
        slug: `runner-${randomUUID()}`,
        name: "Learner runner integration"
      })).id;

    await activateLearner(learnerUserId);
    await activateLearner(otherLearnerUserId);
    course = await createPublishedCourse();

    const offering = await app.inject({
      method: "POST",
      url: `/v1/organizations/${organizationId}/offerings`,
      headers: { "x-test-user-id": ownerUserId },
      payload: {
        courseVersionId: course.courseVersionId,
        slug: `runner-offering-${randomUUID()}`,
        name: "Runner cohort",
        deliveryMode: "cohort",
        startsAt: "2026-01-01T00:00:00.000Z",
        endsAt: "2099-12-31T23:59:59.000Z"
      }
    });
    if (offering.statusCode !== 201) {
      throw new Error(`Failed to create runner offering: ${offering.body}`);
    }
    offeringId = (JSON.parse(offering.body) as { id: string }).id;

    enrollmentId = await createEnrollment(learnerUserId);
    otherEnrollmentId = await createEnrollment(otherLearnerUserId);
    primaryRunId = await createRun("primary-run");
    otherRunId = await createRun("other-run");
    primaryGroup = await createGroup(primaryRunId, "primary");
    otherGroup = await createGroup(otherRunId, "other");

    const membership = await app.inject({
      method: "POST",
      url: `/v1/organizations/${organizationId}/offerings/${offeringId}/runs/${primaryRunId}/group-sets/${primaryGroup.groupSetId}/groups/${primaryGroup.groupId}/memberships`,
      headers: { "x-test-user-id": ownerUserId },
      payload: { enrollmentId }
    });
    if (membership.statusCode !== 201) {
      throw new Error(`Failed to place runner learner: ${membership.body}`);
    }

    await createAssignment("available-offering", { type: "offering" });
    await createAssignment(
      "upcoming-offering",
      { type: "offering" },
      {
        availableAt: "2099-01-01T00:00:00.000Z",
        dueAt: "2099-02-01T00:00:00.000Z"
      }
    );
    await createAssignment(
      "past-due-offering",
      { type: "offering" },
      {
        availableAt: "2020-01-01T00:00:00.000Z",
        dueAt: "2020-02-01T00:00:00.000Z"
      }
    );
    await createAssignment("primary-run", {
      type: "course_run",
      courseRunId: primaryRunId
    });
    await createAssignment("other-run", {
      type: "course_run",
      courseRunId: otherRunId
    });
    await createAssignment("primary-group", {
      type: "group",
      groupId: primaryGroup.groupId
    });
    await createAssignment("other-group", {
      type: "group",
      groupId: otherGroup.groupId
    });
    await createAssignment("direct-enrollment", {
      type: "enrollment",
      enrollmentId
    });
    await createAssignment("other-enrollment", {
      type: "enrollment",
      enrollmentId: otherEnrollmentId
    });

    const cancelledId = await createAssignment("cancelled-offering", {
      type: "offering"
    });
    const cancel = await app.inject({
      method: "POST",
      url: `/v1/organizations/${organizationId}/offerings/${offeringId}/assignments/${cancelledId}/cancel`,
      headers: { "x-test-user-id": ownerUserId }
    });
    if (cancel.statusCode !== 200) {
      throw new Error(`Failed to cancel runner assignment: ${cancel.body}`);
    }
  });

  afterAll(async () => {
    if (app !== undefined) {
      await app.close();
    }

    if (organizationId.length > 0) {
      await migrationPool.query(`DELETE FROM events.outbox WHERE organization_id = $1`, [organizationId]);
      await migrationPool.query(`DELETE FROM learning_progress.evidence WHERE organization_id = $1`, [organizationId]);
      await migrationPool.query(`DELETE FROM learning_progress.submissions WHERE organization_id = $1`, [organizationId]);
      await migrationPool.query(`DELETE FROM learning_progress.attempts WHERE organization_id = $1`, [organizationId]);
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

    if (createdUserIds.length > 0) {
      await migrationPool.query(`DELETE FROM identity.users WHERE id = ANY($1::uuid[])`, [createdUserIds]);
    }

    await migrationPool.end();
  });

  it("resolves audience applicability and exposes timing without enforcing lateness", async () => {
    const response = await app.inject({
      method: "GET",
      url: `/v1/organizations/${organizationId}/enrollments/${enrollmentId}/runner`,
      headers: { "x-test-user-id": learnerUserId }
    });
    expect(response.statusCode).toBe(200);

    const readModel = learnerRunnerReadModelSchema.parse(JSON.parse(response.body));
    expect(readModel.enrollmentId).toBe(enrollmentId);
    expect(readModel.offeringId).toBe(offeringId);

    const bySlug = new Map(
      readModel.assignments.map((item) => [item.assignment.slug, item] as const)
    );
    expect([...bySlug.keys()].sort()).toEqual(
      [
        "available-offering",
        "direct-enrollment",
        "past-due-offering",
        "primary-group",
        "primary-run",
        "upcoming-offering"
      ].sort()
    );
    expect(bySlug.get("available-offering")?.timing).toBe("available");
    expect(bySlug.get("upcoming-offering")?.timing).toBe("upcoming");
    expect(bySlug.get("past-due-offering")?.timing).toBe("past_due");
    expect(bySlug.get("primary-run")?.assignment.audience).toEqual({
      type: "course_run",
      courseRunId: primaryRunId
    });
    expect(bySlug.get("primary-group")?.assignment.audience).toEqual({
      type: "group",
      groupId: primaryGroup.groupId
    });
    expect(bySlug.get("available-offering")?.activity).toMatchObject({
      id: course.assignedActivity.activityVersionId,
      activityId: course.assignedActivity.activityId
    });
    expect(bySlug.has("other-run")).toBe(false);
    expect(bySlug.has("other-group")).toBe(false);
    expect(bySlug.has("other-enrollment")).toBe(false);
    expect(bySlug.has("cancelled-offering")).toBe(false);
  });

  it("requires the learner to own the active Enrollment", async () => {
    const response = await app.inject({
      method: "GET",
      url: `/v1/organizations/${organizationId}/enrollments/${enrollmentId}/runner`,
      headers: { "x-test-user-id": ownerUserId }
    });
    expect(response.statusCode).toBe(403);
  });

  it("does not make Assignment a global Attempt gate", async () => {
    const response = await app.inject({
      method: "POST",
      url: `/v1/organizations/${organizationId}/enrollments/${enrollmentId}/activities/${course.unassignedActivity.activityId}/attempts`,
      headers: { "x-test-user-id": learnerUserId },
      payload: {}
    });
    expect(response.statusCode).toBe(201);
    expect(attemptSchema.parse(JSON.parse(response.body))).toMatchObject({
      enrollmentId,
      activityVersionId: course.unassignedActivity.activityVersionId
    });
  });
});
