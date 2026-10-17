import { randomUUID } from "node:crypto";

import type { NestFastifyApplication } from "@nestjs/platform-fastify";
import {
  attendanceSchema,
  deliveryGroupSchema,
  groupSetSchema,
  learningOfferingSchema,
  sessionSchema
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
    throw new Error(`${name} is required for session-attendance integration tests.`);
  }
  return value;
}

type IdRow = { id: string };
type EventRow = { event_name: string };
type RevisionRow = {
  previous_status: string;
  new_status: string;
  changed_by_user_id: string | null;
};

describe("session and attendance HTTP lifecycle", () => {
  const migrationPool = createDatabasePool(
    requireEnv("DATABASE_MIGRATION_URL"),
    { applicationName: "sessions-attendance-http-integration-fixtures" }
  );

  let app: NestFastifyApplication;
  let ownerUserId = "";
  let learnerUserId = "";
  let secondLearnerUserId = "";
  let organizationId = "";
  let courseId = "";
  let courseVersionId = "";
  let cohortOfferingId = "";
  let selfPacedOfferingId = "";
  let cohortEnrollmentId = "";
  let secondCohortEnrollmentId = "";
  let selfPacedEnrollmentId = "";
  let courseRunId = "";
  let secondCourseRunId = "";
  let groupSetId = "";
  let groupId = "";
  let foreignGroupId = "";
  let runWideSessionId = "";
  let groupSessionId = "";
  let runWideAttendanceId = "";
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
      throw new Error("Failed to create session-attendance integration-test identity.");
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
      throw new Error(`Failed to invite session-attendance learner: ${invite.body}`);
    }

    const accept = await app.inject({
      method: "POST",
      url: `/v1/organizations/${organizationId}/memberships/me/accept`,
      headers: { "x-test-user-id": userId }
    });
    if (accept.statusCode !== 200) {
      throw new Error(`Failed to activate session-attendance learner: ${accept.body}`);
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
      throw new Error(`Failed to assign session-attendance learner role: ${role.body}`);
    }
  }

  async function createEnrollment(offeringId: string, userId: string): Promise<string> {
    const response = await app.inject({
      method: "POST",
      url: `/v1/organizations/${organizationId}/offerings/${offeringId}/enrollments`,
      headers: { "x-test-user-id": ownerUserId },
      payload: { userId }
    });
    if (response.statusCode !== 201) {
      throw new Error(`Failed to create session-attendance enrollment: ${response.body}`);
    }
    return (JSON.parse(response.body) as { id: string }).id;
  }

  beforeAll(async () => {
    ownerUserId = await createUser("session-attendance-owner");
    learnerUserId = await createUser("session-attendance-learner");
    secondLearnerUserId = await createUser("session-attendance-second-learner");

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
        slug: `sessions-attendance-${randomUUID()}`,
        name: "Session attendance integration"
      })).id;

    await activateLearner(learnerUserId);
    await activateLearner(secondLearnerUserId);

    const course = await app.inject({
      method: "POST",
      url: `/v1/organizations/${organizationId}/courses`,
      headers: { "x-test-user-id": ownerUserId },
      payload: {
        slug: `session-attendance-course-${randomUUID()}`,
        title: "Scheduled delivery"
      }
    });
    if (course.statusCode !== 201) {
      throw new Error(`Failed to create session-attendance course: ${course.body}`);
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
      throw new Error(`Failed to publish session-attendance course: ${publish.body}`);
    }

    const cohortOffering = await app.inject({
      method: "POST",
      url: `/v1/organizations/${organizationId}/offerings`,
      headers: { "x-test-user-id": ownerUserId },
      payload: {
        courseVersionId,
        slug: `scheduled-${randomUUID()}`,
        name: "Scheduled cohort",
        deliveryMode: "cohort",
        startsAt: "2099-01-01T00:00:00.000Z",
        endsAt: "2099-12-31T23:59:59.000Z"
      }
    });
    if (cohortOffering.statusCode !== 201) {
      throw new Error(`Failed to create scheduled cohort offering: ${cohortOffering.body}`);
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
        slug: `attendance-self-paced-${randomUUID()}`,
        name: "Attendance self-paced control",
        deliveryMode: "self_paced"
      }
    });
    if (selfPacedOffering.statusCode !== 201) {
      throw new Error(`Failed to create attendance control offering: ${selfPacedOffering.body}`);
    }
    selfPacedOfferingId = learningOfferingSchema.parse(
      JSON.parse(selfPacedOffering.body)
    ).id;

    cohortEnrollmentId = await createEnrollment(cohortOfferingId, learnerUserId);
    secondCohortEnrollmentId = await createEnrollment(
      cohortOfferingId,
      secondLearnerUserId
    );
    selfPacedEnrollmentId = await createEnrollment(
      selfPacedOfferingId,
      learnerUserId
    );

    const firstRun = await app.inject({
      method: "POST",
      url: `/v1/organizations/${organizationId}/offerings/${cohortOfferingId}/runs`,
      headers: { "x-test-user-id": ownerUserId },
      payload: {
        slug: "primary-run",
        name: "Primary run",
        startsAt: "2099-02-01T00:00:00.000Z",
        endsAt: "2099-11-30T23:59:59.000Z"
      }
    });
    if (firstRun.statusCode !== 201) {
      throw new Error(`Failed to create primary course run: ${firstRun.body}`);
    }
    courseRunId = (JSON.parse(firstRun.body) as { id: string }).id;

    const secondRun = await app.inject({
      method: "POST",
      url: `/v1/organizations/${organizationId}/offerings/${cohortOfferingId}/runs`,
      headers: { "x-test-user-id": ownerUserId },
      payload: {
        slug: "secondary-run",
        name: "Secondary run",
        startsAt: "2099-03-01T00:00:00.000Z",
        endsAt: "2099-10-31T23:59:59.000Z"
      }
    });
    if (secondRun.statusCode !== 201) {
      throw new Error(`Failed to create secondary course run: ${secondRun.body}`);
    }
    secondCourseRunId = (JSON.parse(secondRun.body) as { id: string }).id;

    const groupSet = await app.inject({
      method: "POST",
      url: `/v1/organizations/${organizationId}/offerings/${cohortOfferingId}/runs/${courseRunId}/group-sets`,
      headers: { "x-test-user-id": ownerUserId },
      payload: { slug: "labs", name: "Labs" }
    });
    if (groupSet.statusCode !== 201) {
      throw new Error(`Failed to create primary group set: ${groupSet.body}`);
    }
    groupSetId = groupSetSchema.parse(JSON.parse(groupSet.body)).id;

    const group = await app.inject({
      method: "POST",
      url: `/v1/organizations/${organizationId}/offerings/${cohortOfferingId}/runs/${courseRunId}/group-sets/${groupSetId}/groups`,
      headers: { "x-test-user-id": ownerUserId },
      payload: { slug: "lab-a", name: "Lab A" }
    });
    if (group.statusCode !== 201) {
      throw new Error(`Failed to create primary group: ${group.body}`);
    }
    groupId = deliveryGroupSchema.parse(JSON.parse(group.body)).id;

    const foreignGroupSet = await app.inject({
      method: "POST",
      url: `/v1/organizations/${organizationId}/offerings/${cohortOfferingId}/runs/${secondCourseRunId}/group-sets`,
      headers: { "x-test-user-id": ownerUserId },
      payload: { slug: "foreign-labs", name: "Foreign labs" }
    });
    if (foreignGroupSet.statusCode !== 201) {
      throw new Error(`Failed to create foreign group set: ${foreignGroupSet.body}`);
    }
    const foreignGroupSetId = groupSetSchema.parse(
      JSON.parse(foreignGroupSet.body)
    ).id;

    const foreignGroup = await app.inject({
      method: "POST",
      url: `/v1/organizations/${organizationId}/offerings/${cohortOfferingId}/runs/${secondCourseRunId}/group-sets/${foreignGroupSetId}/groups`,
      headers: { "x-test-user-id": ownerUserId },
      payload: { slug: "foreign-lab", name: "Foreign lab" }
    });
    if (foreignGroup.statusCode !== 201) {
      throw new Error(`Failed to create foreign group: ${foreignGroup.body}`);
    }
    foreignGroupId = deliveryGroupSchema.parse(JSON.parse(foreignGroup.body)).id;

    const membership = await app.inject({
      method: "POST",
      url: `/v1/organizations/${organizationId}/offerings/${cohortOfferingId}/runs/${courseRunId}/group-sets/${groupSetId}/groups/${groupId}/memberships`,
      headers: { "x-test-user-id": ownerUserId },
      payload: { enrollmentId: cohortEnrollmentId }
    });
    if (membership.statusCode !== 201) {
      throw new Error(`Failed to create primary group membership: ${membership.body}`);
    }
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
        `DELETE FROM learning_delivery.attendance_revisions WHERE organization_id = $1`,
        [organizationId]
      );
      await migrationPool.query(
        `DELETE FROM learning_delivery.attendances WHERE organization_id = $1`,
        [organizationId]
      );
      await migrationPool.query(
        `DELETE FROM learning_delivery.sessions WHERE organization_id = $1`,
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

  it("does not let a learner schedule a session", async () => {
    const response = await app.inject({
      method: "POST",
      url: `/v1/organizations/${organizationId}/offerings/${cohortOfferingId}/runs/${courseRunId}/sessions`,
      headers: { "x-test-user-id": learnerUserId },
      payload: {
        slug: "learner-session",
        name: "Learner session",
        startsAt: "2099-10-01T08:00:00.000Z",
        endsAt: "2099-10-01T09:00:00.000Z"
      }
    });
    expect(response.statusCode).toBe(403);
  });

  it("creates a run-wide session and exposes it through offering read authority", async () => {
    const response = await app.inject({
      method: "POST",
      url: `/v1/organizations/${organizationId}/offerings/${cohortOfferingId}/runs/${courseRunId}/sessions`,
      headers: { "x-test-user-id": ownerUserId },
      payload: {
        slug: "lecture-01",
        name: "Lecture 01",
        startsAt: "2099-10-01T09:00:00.000Z",
        endsAt: "2099-10-01T10:30:00.000Z"
      }
    });

    expect(response.statusCode).toBe(201);
    const session = sessionSchema.parse(JSON.parse(response.body));
    runWideSessionId = session.id;
    expect(session).toMatchObject({
      organizationId,
      courseRunId,
      groupId: null,
      slug: "lecture-01"
    });

    const read = await app.inject({
      method: "GET",
      url: `/v1/organizations/${organizationId}/offerings/${cohortOfferingId}/runs/${courseRunId}/sessions/${runWideSessionId}`,
      headers: { "x-test-user-id": learnerUserId }
    });
    expect(read.statusCode).toBe(200);
    expect(sessionSchema.parse(JSON.parse(read.body)).id).toBe(runWideSessionId);
  });

  it("keeps session scheduling inside the course-run window at application and database boundaries", async () => {
    const response = await app.inject({
      method: "POST",
      url: `/v1/organizations/${organizationId}/offerings/${cohortOfferingId}/runs/${courseRunId}/sessions`,
      headers: { "x-test-user-id": ownerUserId },
      payload: {
        slug: "outside-run",
        name: "Outside run",
        startsAt: "2099-01-15T09:00:00.000Z",
        endsAt: "2099-01-15T10:00:00.000Z"
      }
    });
    expect(response.statusCode).toBe(409);

    await expect(
      migrationPool.query(
        `INSERT INTO learning_delivery.sessions
           (organization_id, course_run_id, slug, name, starts_at, ends_at, created_by_user_id)
         VALUES ($1, $2, $3, $4, $5::timestamptz, $6::timestamptz, $7)`,
        [
          organizationId,
          courseRunId,
          `db-outside-${randomUUID()}`,
          "Database outside run",
          "2099-01-15T09:00:00.000Z",
          "2099-01-15T10:00:00.000Z",
          ownerUserId
        ]
      )
    ).rejects.toMatchObject({ code: "23514" });
  });

  it("allows a group-scoped session only for a group from the same course run", async () => {
    const valid = await app.inject({
      method: "POST",
      url: `/v1/organizations/${organizationId}/offerings/${cohortOfferingId}/runs/${courseRunId}/sessions`,
      headers: { "x-test-user-id": ownerUserId },
      payload: {
        groupId,
        slug: "lab-01",
        name: "Lab 01",
        startsAt: "2099-10-02T09:00:00.000Z",
        endsAt: "2099-10-02T10:30:00.000Z"
      }
    });
    expect(valid.statusCode).toBe(201);
    groupSessionId = sessionSchema.parse(JSON.parse(valid.body)).id;

    const foreign = await app.inject({
      method: "POST",
      url: `/v1/organizations/${organizationId}/offerings/${cohortOfferingId}/runs/${courseRunId}/sessions`,
      headers: { "x-test-user-id": ownerUserId },
      payload: {
        groupId: foreignGroupId,
        slug: "foreign-group-session",
        name: "Foreign group session",
        startsAt: "2099-10-03T09:00:00.000Z",
        endsAt: "2099-10-03T10:00:00.000Z"
      }
    });
    expect(foreign.statusCode).toBe(404);

    await expect(
      migrationPool.query(
        `INSERT INTO learning_delivery.sessions
           (organization_id, course_run_id, group_id, slug, name, starts_at, ends_at, created_by_user_id)
         VALUES ($1, $2, $3, $4, $5, $6::timestamptz, $7::timestamptz, $8)`,
        [
          organizationId,
          courseRunId,
          foreignGroupId,
          `db-foreign-${randomUUID()}`,
          "Database foreign group",
          "2099-10-03T09:00:00.000Z",
          "2099-10-03T10:00:00.000Z",
          ownerUserId
        ]
      )
    ).rejects.toMatchObject({ code: "23514" });
  });

  it("records one run-wide attendance per enrollment and rejects another offering", async () => {
    const response = await app.inject({
      method: "POST",
      url: `/v1/organizations/${organizationId}/offerings/${cohortOfferingId}/runs/${courseRunId}/sessions/${runWideSessionId}/attendances`,
      headers: { "x-test-user-id": ownerUserId },
      payload: { enrollmentId: cohortEnrollmentId, status: "present" }
    });
    expect(response.statusCode).toBe(201);
    const attendance = attendanceSchema.parse(JSON.parse(response.body));
    runWideAttendanceId = attendance.id;
    expect(attendance).toMatchObject({
      sessionId: runWideSessionId,
      enrollmentId: cohortEnrollmentId,
      status: "present"
    });

    const duplicate = await app.inject({
      method: "POST",
      url: `/v1/organizations/${organizationId}/offerings/${cohortOfferingId}/runs/${courseRunId}/sessions/${runWideSessionId}/attendances`,
      headers: { "x-test-user-id": ownerUserId },
      payload: { enrollmentId: cohortEnrollmentId, status: "late" }
    });
    expect(duplicate.statusCode).toBe(409);

    const wrongOffering = await app.inject({
      method: "POST",
      url: `/v1/organizations/${organizationId}/offerings/${cohortOfferingId}/runs/${courseRunId}/sessions/${runWideSessionId}/attendances`,
      headers: { "x-test-user-id": ownerUserId },
      payload: { enrollmentId: selfPacedEnrollmentId, status: "present" }
    });
    expect(wrongOffering.statusCode).toBe(409);

    await expect(
      migrationPool.query(
        `INSERT INTO learning_delivery.attendances
           (organization_id, session_id, enrollment_id, status, recorded_by_user_id, updated_by_user_id)
         VALUES ($1, $2, $3, 'present', $4, $4)`,
        [organizationId, runWideSessionId, selfPacedEnrollmentId, ownerUserId]
      )
    ).rejects.toMatchObject({ code: "23514" });
  });

  it("uses group membership at session start for group-scoped attendance", async () => {
    const valid = await app.inject({
      method: "POST",
      url: `/v1/organizations/${organizationId}/offerings/${cohortOfferingId}/runs/${courseRunId}/sessions/${groupSessionId}/attendances`,
      headers: { "x-test-user-id": ownerUserId },
      payload: { enrollmentId: cohortEnrollmentId, status: "late" }
    });
    expect(valid.statusCode).toBe(201);

    const withoutMembership = await app.inject({
      method: "POST",
      url: `/v1/organizations/${organizationId}/offerings/${cohortOfferingId}/runs/${courseRunId}/sessions/${groupSessionId}/attendances`,
      headers: { "x-test-user-id": ownerUserId },
      payload: { enrollmentId: secondCohortEnrollmentId, status: "absent" }
    });
    expect(withoutMembership.statusCode).toBe(409);

    await expect(
      migrationPool.query(
        `INSERT INTO learning_delivery.attendances
           (organization_id, session_id, enrollment_id, status, recorded_by_user_id, updated_by_user_id)
         VALUES ($1, $2, $3, 'absent', $4, $4)`,
        [organizationId, groupSessionId, secondCohortEnrollmentId, ownerUserId]
      )
    ).rejects.toMatchObject({ code: "23514" });
  });

  it("does not let a learner manage attendance", async () => {
    const response = await app.inject({
      method: "POST",
      url: `/v1/organizations/${organizationId}/offerings/${cohortOfferingId}/runs/${courseRunId}/sessions/${runWideSessionId}/attendances`,
      headers: { "x-test-user-id": learnerUserId },
      payload: { enrollmentId: secondCohortEnrollmentId, status: "present" }
    });
    expect(response.statusCode).toBe(403);
  });

  it("corrects attendance while preserving an append-only database revision", async () => {
    const response = await app.inject({
      method: "PATCH",
      url: `/v1/organizations/${organizationId}/offerings/${cohortOfferingId}/runs/${courseRunId}/sessions/${runWideSessionId}/attendances/${runWideAttendanceId}`,
      headers: { "x-test-user-id": ownerUserId },
      payload: { status: "excused" }
    });
    expect(response.statusCode).toBe(200);
    expect(attendanceSchema.parse(JSON.parse(response.body)).status).toBe("excused");

    const revisions = await migrationPool.query<RevisionRow>(
      `SELECT previous_status, new_status, changed_by_user_id::text
         FROM learning_delivery.attendance_revisions
        WHERE organization_id = $1
          AND attendance_id = $2`,
      [organizationId, runWideAttendanceId]
    );
    expect(revisions.rows).toEqual([
      {
        previous_status: "present",
        new_status: "excused",
        changed_by_user_id: ownerUserId
      }
    ]);
  });

  it("records session and attendance mutations in the transactional outbox", async () => {
    const result = await migrationPool.query<EventRow>(
      `SELECT event_name
         FROM events.outbox
        WHERE organization_id = $1
          AND event_name IN (
            'session.created',
            'attendance.recorded',
            'attendance.corrected'
          )`,
      [organizationId]
    );
    const names = result.rows.map((row) => row.event_name);

    expect(names.filter((name) => name === "session.created")).toHaveLength(2);
    expect(names.filter((name) => name === "attendance.recorded")).toHaveLength(2);
    expect(names.filter((name) => name === "attendance.corrected")).toHaveLength(1);
  });
});
