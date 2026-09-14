import { randomUUID } from "node:crypto";

import {
  createDatabasePool,
  withTenantTransaction
} from "@platform/database";
import type { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (value === undefined || value.trim().length === 0) {
    throw new Error(`${name} is required for delivery-history integration tests.`);
  }
  return value;
}

type Fixture = Readonly<{
  ownerUserId: string;
  learnerUserId: string;
  organizationId: string;
  courseId: string;
  courseVersionId: string;
  offeringId: string;
  enrollmentId: string;
  courseRunId: string;
  groupSetId: string;
  groupAId: string;
  groupBId: string;
  groupMembershipId: string;
  sessionId: string;
  raceSessionId: string;
  attendanceId: string;
}>;

type RevisionRow = Readonly<{
  previous_status: string;
  new_status: string;
  changed_by_user_id: string | null;
}>;

let migrationPool: Pool;
let appPool: Pool;
let fixture: Fixture | undefined;

async function nextUuid(pool: Pool): Promise<string> {
  const result = await pool.query<{ id: string }>("SELECT uuidv7()::text AS id");
  const id = result.rows[0]?.id;
  if (id === undefined) {
    throw new Error("PostgreSQL did not generate a delivery-history fixture UUID.");
  }
  return id;
}

function requireFixture(): Fixture {
  if (fixture === undefined) {
    throw new Error("Delivery-history fixture is not initialized.");
  }
  return fixture;
}

beforeAll(async () => {
  migrationPool = createDatabasePool(requireEnv("DATABASE_MIGRATION_URL"), {
    applicationName: "delivery-history-hardening-migrator",
    maxConnections: 4
  });
  appPool = createDatabasePool(requireEnv("DATABASE_URL"), {
    applicationName: "delivery-history-hardening-app",
    maxConnections: 4
  });

  const suffix = randomUUID().replaceAll("-", "").slice(0, 16);
  const ownerUserId = await nextUuid(migrationPool);
  const learnerUserId = await nextUuid(migrationPool);
  const organizationId = await nextUuid(migrationPool);
  const courseId = await nextUuid(migrationPool);
  const courseVersionId = await nextUuid(migrationPool);
  const offeringId = await nextUuid(migrationPool);
  const enrollmentId = await nextUuid(migrationPool);
  const courseRunId = await nextUuid(migrationPool);
  const groupSetId = await nextUuid(migrationPool);
  const groupAId = await nextUuid(migrationPool);
  const groupBId = await nextUuid(migrationPool);
  const groupMembershipId = await nextUuid(migrationPool);
  const sessionId = await nextUuid(migrationPool);
  const raceSessionId = await nextUuid(migrationPool);
  const attendanceId = await nextUuid(migrationPool);

  await migrationPool.query(
    `INSERT INTO identity.users (id, email, display_name)
     VALUES
       ($1, $3, 'Delivery History Owner'),
       ($2, $4, 'Delivery History Learner')`,
    [
      ownerUserId,
      learnerUserId,
      `delivery-history-owner-${suffix}@example.test`,
      `delivery-history-learner-${suffix}@example.test`
    ]
  );

  await migrationPool.query(
    `INSERT INTO organizations.organizations
       (id, slug, name, created_by_user_id)
     VALUES ($1, $2, 'Delivery history hardening', $3)`,
    [organizationId, `delivery-history-${suffix}`, ownerUserId]
  );

  await migrationPool.query(
    `INSERT INTO organizations.memberships
       (organization_id, user_id, status, joined_at)
     VALUES
       ($1, $2, 'active', '2098-01-01T00:00:00.000Z'),
       ($1, $3, 'active', '2098-01-01T00:00:00.000Z')`,
    [organizationId, ownerUserId, learnerUserId]
  );

  await migrationPool.query(
    `INSERT INTO learning_content.courses
       (id, organization_id, slug, created_by_user_id)
     VALUES ($1, $2, $3, $4)`,
    [courseId, organizationId, `delivery-history-course-${suffix}`, ownerUserId]
  );

  await migrationPool.query(
    `INSERT INTO learning_content.course_versions
       (id, organization_id, course_id, version_number, status, title,
        created_by_user_id, published_by_user_id, published_at)
     VALUES ($1, $2, $3, 1, 'published', 'Delivery history course',
             $4, $4, '2098-01-01T00:00:00.000Z')`,
    [courseVersionId, organizationId, courseId, ownerUserId]
  );

  await migrationPool.query(
    `INSERT INTO learning_delivery.learning_offerings
       (id, organization_id, course_version_id, slug, name, delivery_mode,
        starts_at, ends_at, created_by_user_id)
     VALUES ($1, $2, $3, $4, 'Delivery history cohort', 'cohort',
             '2098-01-01T00:00:00.000Z', '2100-01-01T00:00:00.000Z', $5)`,
    [offeringId, organizationId, courseVersionId, `delivery-history-${suffix}`, ownerUserId]
  );

  await migrationPool.query(
    `INSERT INTO learning_delivery.enrollments
       (id, organization_id, offering_id, user_id, enrolled_at, created_by_user_id)
     VALUES ($1, $2, $3, $4, '2098-06-01T00:00:00.000Z', $5)`,
    [enrollmentId, organizationId, offeringId, learnerUserId, ownerUserId]
  );

  await migrationPool.query(
    `INSERT INTO learning_delivery.course_runs
       (id, organization_id, offering_id, slug, name, starts_at, ends_at, created_by_user_id)
     VALUES ($1, $2, $3, 'history-run', 'History run',
             '2099-01-01T00:00:00.000Z', '2099-12-31T23:59:59.000Z', $4)`,
    [courseRunId, organizationId, offeringId, ownerUserId]
  );

  await migrationPool.query(
    `INSERT INTO learning_delivery.group_sets
       (id, organization_id, course_run_id, slug, name, created_by_user_id)
     VALUES ($1, $2, $3, 'labs', 'Labs', $4)`,
    [groupSetId, organizationId, courseRunId, ownerUserId]
  );

  await migrationPool.query(
    `INSERT INTO learning_delivery.groups
       (id, organization_id, group_set_id, slug, name, created_by_user_id)
     VALUES
       ($1, $3, $4, 'lab-a', 'Lab A', $5),
       ($2, $3, $4, 'lab-b', 'Lab B', $5)`,
    [groupAId, groupBId, organizationId, groupSetId, ownerUserId]
  );

  await migrationPool.query(
    `INSERT INTO learning_delivery.group_memberships
       (id, organization_id, group_set_id, group_id, enrollment_id,
        assigned_at, assigned_by_user_id)
     VALUES ($1, $2, $3, $4, $5, '2099-05-01T00:00:00.000Z', $6)`,
    [
      groupMembershipId,
      organizationId,
      groupSetId,
      groupAId,
      enrollmentId,
      ownerUserId
    ]
  );

  await migrationPool.query(
    `INSERT INTO learning_delivery.sessions
       (id, organization_id, course_run_id, group_id, slug, name,
        starts_at, ends_at, created_by_user_id)
     VALUES
       ($1, $3, $4, $5, 'lab-history', 'Historical lab',
        '2099-06-01T09:00:00.000Z', '2099-06-01T10:00:00.000Z', $6),
       ($2, $3, $4, NULL, 'race-session', 'Race session',
        '2099-07-01T09:00:00.000Z', '2099-07-01T10:00:00.000Z', $6)`,
    [sessionId, raceSessionId, organizationId, courseRunId, groupAId, ownerUserId]
  );

  await migrationPool.query(
    `INSERT INTO learning_delivery.attendances
       (id, organization_id, session_id, enrollment_id, status,
        recorded_by_user_id, updated_by_user_id)
     VALUES ($1, $2, $3, $4, 'present', $5, $5)`,
    [attendanceId, organizationId, sessionId, enrollmentId, ownerUserId]
  );

  fixture = {
    ownerUserId,
    learnerUserId,
    organizationId,
    courseId,
    courseVersionId,
    offeringId,
    enrollmentId,
    courseRunId,
    groupSetId,
    groupAId,
    groupBId,
    groupMembershipId,
    sessionId,
    raceSessionId,
    attendanceId
  };
});

afterAll(async () => {
  if (fixture !== undefined) {
    const f = fixture;
    await migrationPool.query(
      `DELETE FROM learning_delivery.attendance_revisions WHERE organization_id = $1`,
      [f.organizationId]
    );
    await migrationPool.query(
      `DELETE FROM learning_delivery.attendances WHERE organization_id = $1`,
      [f.organizationId]
    );
    await migrationPool.query(
      `DELETE FROM learning_delivery.sessions WHERE organization_id = $1`,
      [f.organizationId]
    );
    await migrationPool.query(
      `DELETE FROM learning_delivery.group_memberships WHERE organization_id = $1`,
      [f.organizationId]
    );
    await migrationPool.query(
      `DELETE FROM learning_delivery.groups WHERE organization_id = $1`,
      [f.organizationId]
    );
    await migrationPool.query(
      `DELETE FROM learning_delivery.group_sets WHERE organization_id = $1`,
      [f.organizationId]
    );
    await migrationPool.query(
      `DELETE FROM learning_delivery.course_runs WHERE organization_id = $1`,
      [f.organizationId]
    );
    await migrationPool.query(
      `DELETE FROM learning_delivery.enrollments WHERE organization_id = $1`,
      [f.organizationId]
    );
    await migrationPool.query(
      `DELETE FROM learning_delivery.learning_offerings WHERE organization_id = $1`,
      [f.organizationId]
    );
    await migrationPool.query(
      `DELETE FROM learning_content.course_versions WHERE organization_id = $1`,
      [f.organizationId]
    );
    await migrationPool.query(
      `DELETE FROM learning_content.courses WHERE organization_id = $1`,
      [f.organizationId]
    );
    await migrationPool.query(
      `DELETE FROM organizations.organizations WHERE id = $1`,
      [f.organizationId]
    );
    await migrationPool.query(
      `DELETE FROM identity.users WHERE id = ANY($1::uuid[])`,
      [[f.ownerUserId, f.learnerUserId]]
    );
  }

  await Promise.all([appPool?.end(), migrationPool?.end()]);
});

describe("delivery history hardening", () => {
  it("removes runtime permission to mutate delivery identity columns", async () => {
    const f = requireFixture();

    await expect(
      withTenantTransaction(
        appPool,
        { organizationId: f.organizationId, userId: f.ownerUserId },
        async ({ client }) =>
          client.query(
            `UPDATE learning_delivery.enrollments
                SET offering_id = $1
              WHERE organization_id = $2 AND id = $3`,
            [f.offeringId, f.organizationId, f.enrollmentId]
          )
      )
    ).rejects.toMatchObject({ code: "42501" });

    await expect(
      withTenantTransaction(
        appPool,
        { organizationId: f.organizationId, userId: f.ownerUserId },
        async ({ client }) =>
          client.query(
            `UPDATE learning_delivery.group_memberships
                SET group_id = $1
              WHERE organization_id = $2 AND id = $3`,
            [f.groupBId, f.organizationId, f.groupMembershipId]
          )
      )
    ).rejects.toMatchObject({ code: "42501" });

    await expect(
      withTenantTransaction(
        appPool,
        { organizationId: f.organizationId, userId: f.ownerUserId },
        async ({ client }) =>
          client.query(
            `UPDATE learning_delivery.attendances
                SET enrollment_id = $1
              WHERE organization_id = $2 AND id = $3`,
            [f.enrollmentId, f.organizationId, f.attendanceId]
          )
      )
    ).rejects.toMatchObject({ code: "42501" });
  });

  it("keeps structural identities immutable even for privileged maintenance paths", async () => {
    const f = requireFixture();

    await expect(
      migrationPool.query(
        `UPDATE learning_delivery.enrollments
            SET enrolled_at = enrolled_at - interval '1 day'
          WHERE organization_id = $1 AND id = $2`,
        [f.organizationId, f.enrollmentId]
      )
    ).rejects.toMatchObject({ code: "55000" });

    await expect(
      migrationPool.query(
        `UPDATE learning_delivery.group_memberships
            SET group_id = $1
          WHERE organization_id = $2 AND id = $3`,
        [f.groupBId, f.organizationId, f.groupMembershipId]
      )
    ).rejects.toMatchObject({ code: "55000" });

    await expect(
      migrationPool.query(
        `UPDATE learning_delivery.sessions
            SET course_run_id = $1
          WHERE organization_id = $2 AND id = $3`,
        [f.courseRunId, f.organizationId, f.sessionId]
      )
    ).rejects.toMatchObject({ code: "55000" });

    await expect(
      migrationPool.query(
        `UPDATE learning_delivery.attendances
            SET recorded_at = recorded_at + interval '1 second'
          WHERE organization_id = $1 AND id = $2`,
        [f.organizationId, f.attendanceId]
      )
    ).rejects.toMatchObject({ code: "55000" });
  });

  it("does not let parent schedule changes orphan existing descendants", async () => {
    const f = requireFixture();

    await expect(
      migrationPool.query(
        `UPDATE learning_delivery.course_runs
            SET ends_at = '2099-05-31T23:59:59.000Z'
          WHERE organization_id = $1 AND id = $2`,
        [f.organizationId, f.courseRunId]
      )
    ).rejects.toMatchObject({ code: "23514" });

    await expect(
      migrationPool.query(
        `UPDATE learning_delivery.learning_offerings
            SET ends_at = '2099-06-30T23:59:59.000Z'
          WHERE organization_id = $1 AND id = $2`,
        [f.organizationId, f.offeringId]
      )
    ).rejects.toMatchObject({ code: "23514" });
  });

  it("does not let rescheduling or regrouping invalidate recorded attendance", async () => {
    const f = requireFixture();

    await expect(
      migrationPool.query(
        `UPDATE learning_delivery.sessions
            SET group_id = $1
          WHERE organization_id = $2 AND id = $3`,
        [f.groupBId, f.organizationId, f.sessionId]
      )
    ).rejects.toMatchObject({ code: "23514" });

    await expect(
      migrationPool.query(
        `UPDATE learning_delivery.sessions
            SET starts_at = '2099-04-01T09:00:00.000Z'
          WHERE organization_id = $1 AND id = $2`,
        [f.organizationId, f.sessionId]
      )
    ).rejects.toMatchObject({ code: "23514" });
  });

  it("does not let membership history be rewritten underneath attendance", async () => {
    const f = requireFixture();

    await expect(
      migrationPool.query(
        `UPDATE learning_delivery.group_memberships
            SET ended_at = '2099-06-01T09:00:00.000Z'
          WHERE organization_id = $1 AND id = $2`,
        [f.organizationId, f.groupMembershipId]
      )
    ).rejects.toMatchObject({ code: "23514" });
  });

  it("serializes concurrent attendance creation through the database uniqueness boundary", async () => {
    const f = requireFixture();
    const firstAttendanceId = await nextUuid(migrationPool);
    const secondAttendanceId = await nextUuid(migrationPool);

    const insert = (attendanceId: string, status: "present" | "late") =>
      withTenantTransaction(
        appPool,
        { organizationId: f.organizationId, userId: f.ownerUserId },
        async ({ client }) =>
          client.query(
            `INSERT INTO learning_delivery.attendances
               (id, organization_id, session_id, enrollment_id, status,
                recorded_by_user_id, updated_by_user_id)
             VALUES ($1, $2, $3, $4, $5, $6, $6)`,
            [
              attendanceId,
              f.organizationId,
              f.raceSessionId,
              f.enrollmentId,
              status,
              f.ownerUserId
            ]
          )
      );

    const results = await Promise.allSettled([
      insert(firstAttendanceId, "present"),
      insert(secondAttendanceId, "late")
    ]);

    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    const rejected = results.find((result) => result.status === "rejected");
    expect(rejected).toBeDefined();
    if (rejected?.status === "rejected") {
      expect(rejected.reason).toMatchObject({ code: "23505" });
    }

    const persisted = await migrationPool.query<{ count: string }>(
      `SELECT count(*)::text AS count
         FROM learning_delivery.attendances
        WHERE organization_id = $1
          AND session_id = $2
          AND enrollment_id = $3`,
      [f.organizationId, f.raceSessionId, f.enrollmentId]
    );
    expect(persisted.rows[0]?.count).toBe("1");
  });

  it("audits corrections and rejects actor spoofing", async () => {
    const f = requireFixture();

    await withTenantTransaction(
      appPool,
      { organizationId: f.organizationId, userId: f.ownerUserId },
      async ({ client }) => {
        await client.query(
          `UPDATE learning_delivery.attendances
              SET status = 'late', updated_by_user_id = $1
            WHERE organization_id = $2 AND id = $3`,
          [f.ownerUserId, f.organizationId, f.attendanceId]
        );
      }
    );

    await expect(
      withTenantTransaction(
        appPool,
        { organizationId: f.organizationId, userId: f.ownerUserId },
        async ({ client }) =>
          client.query(
            `UPDATE learning_delivery.attendances
                SET status = 'excused', updated_by_user_id = $1
              WHERE organization_id = $2 AND id = $3`,
            [f.learnerUserId, f.organizationId, f.attendanceId]
          )
      )
    ).rejects.toMatchObject({ code: "55000" });

    const current = await migrationPool.query<{ status: string }>(
      `SELECT status
         FROM learning_delivery.attendances
        WHERE organization_id = $1 AND id = $2`,
      [f.organizationId, f.attendanceId]
    );
    expect(current.rows[0]?.status).toBe("late");

    const revisions = await migrationPool.query<RevisionRow>(
      `SELECT previous_status, new_status, changed_by_user_id::text
         FROM learning_delivery.attendance_revisions
        WHERE organization_id = $1 AND attendance_id = $2
        ORDER BY changed_at, id`,
      [f.organizationId, f.attendanceId]
    );
    expect(revisions.rows).toEqual([
      {
        previous_status: "present",
        new_status: "late",
        changed_by_user_id: f.ownerUserId
      }
    ]);
  });
});
