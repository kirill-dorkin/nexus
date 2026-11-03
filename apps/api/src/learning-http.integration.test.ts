import { randomUUID } from "node:crypto";

import type { NestFastifyApplication } from "@nestjs/platform-fastify";
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
    throw new Error(`${name} is required for learning integration tests.`);
  }
  return value;
}

type IdRow = { id: string };
type EventRow = { event_name: string };

describe("learning catalog, offering, and enrollment HTTP lifecycle", () => {
  const migrationPool = createDatabasePool(
    requireEnv("DATABASE_MIGRATION_URL"),
    { applicationName: "learning-http-integration-fixtures" }
  );

  let app: NestFastifyApplication;
  let ownerUserId = "";
  let learnerUserId = "";
  let outsiderUserId = "";
  let organizationId = "";
  let courseId = "";
  let versionOneId = "";
  let versionTwoId = "";
  let offeringId = "";
  const createdUserIds: string[] = [];
  const organizationSlug = `learning-${randomUUID()}`;
  const courseSlug = `frontend-${randomUUID()}`;
  const offeringSlug = `self-paced-${randomUUID()}`;

  async function createUser(label: string): Promise<string> {
    const result = await migrationPool.query<IdRow>(
      `INSERT INTO identity.users (email, display_name)
       VALUES ($1, $2)
       RETURNING id::text`,
      [`${label}-${randomUUID()}@example.test`, label]
    );
    const id = result.rows[0]?.id;
    if (id === undefined) {
      throw new Error("Failed to create learning integration-test identity.");
    }
    createdUserIds.push(id);
    return id;
  }

  beforeAll(async () => {
    ownerUserId = await createUser("learning-owner");
    learnerUserId = await createUser("learning-learner");
    outsiderUserId = await createUser("learning-outsider");

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
        slug: organizationSlug,
        name: "Learning domain integration"
      })
    ).id;

    const invite = await app.inject({
      method: "POST",
      url: `/v1/organizations/${organizationId}/memberships`,
      headers: { "x-test-user-id": ownerUserId },
      payload: { userId: learnerUserId }
    });
    if (invite.statusCode !== 201) {
      throw new Error(`Failed to invite learning test learner: ${invite.body}`);
    }

    const accept = await app.inject({
      method: "POST",
      url: `/v1/organizations/${organizationId}/memberships/me/accept`,
      headers: { "x-test-user-id": learnerUserId }
    });
    if (accept.statusCode !== 200) {
      throw new Error(
        `Failed to activate learning test learner: ${accept.body}`
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
        `Failed to assign learning test learner role: ${role.body}`
      );
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

  it("keeps learner roles read-only for course creation", async () => {
    const response = await app.inject({
      method: "POST",
      url: `/v1/organizations/${organizationId}/courses`,
      headers: { "x-test-user-id": learnerUserId },
      payload: {
        slug: `learner-${randomUUID()}`,
        title: "Learners must not create this"
      }
    });

    expect(response.statusCode).toBe(403);
  });

  it("creates a stable course identity with an initial draft version", async () => {
    const response = await app.inject({
      method: "POST",
      url: `/v1/organizations/${organizationId}/courses`,
      headers: { "x-test-user-id": ownerUserId },
      payload: {
        slug: courseSlug,
        title: "Frontend Development",
        description: "Versioned learning content"
      }
    });

    expect(response.statusCode).toBe(201);
    const body = JSON.parse(response.body) as {
      course: { id: string; slug: string; status: string };
      draftVersion: {
        id: string;
        courseId: string;
        versionNumber: number;
        status: string;
        title: string;
      };
    };
    courseId = body.course.id;
    versionOneId = body.draftVersion.id;

    expect(body.course).toMatchObject({
      slug: courseSlug,
      status: "active"
    });
    expect(body.draftVersion).toMatchObject({
      courseId,
      versionNumber: 1,
      status: "draft",
      title: "Frontend Development"
    });
  });

  it("does not create delivery from an unpublished course version", async () => {
    const response = await app.inject({
      method: "POST",
      url: `/v1/organizations/${organizationId}/offerings`,
      headers: { "x-test-user-id": ownerUserId },
      payload: {
        courseVersionId: versionOneId,
        slug: `draft-${randomUUID()}`,
        name: "Draft delivery",
        deliveryMode: "self_paced"
      }
    });

    expect(response.statusCode).toBe(409);
  });

  it("enforces one editable draft per course", async () => {
    const response = await app.inject({
      method: "POST",
      url: `/v1/organizations/${organizationId}/courses/${courseId}/versions`,
      headers: { "x-test-user-id": ownerUserId },
      payload: { title: "Competing draft" }
    });

    expect(response.statusCode).toBe(409);
  });

  it("publishes version one and makes the persisted version immutable", async () => {
    const response = await app.inject({
      method: "POST",
      url: `/v1/organizations/${organizationId}/courses/${courseId}/versions/${versionOneId}/publish`,
      headers: { "x-test-user-id": ownerUserId }
    });

    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body)).toMatchObject({
      id: versionOneId,
      courseId,
      versionNumber: 1,
      status: "published"
    });

    await expect(
      migrationPool.query(
        `UPDATE learning_content.course_versions
            SET title = 'Mutated published title'
          WHERE id = $1`,
        [versionOneId]
      )
    ).rejects.toMatchObject({ code: "55000" });
  });

  it("opens a new draft only after the previous version was published", async () => {
    const response = await app.inject({
      method: "POST",
      url: `/v1/organizations/${organizationId}/courses/${courseId}/versions`,
      headers: { "x-test-user-id": ownerUserId },
      payload: {
        title: "Frontend Development v2",
        description: "Next immutable release candidate"
      }
    });

    expect(response.statusCode).toBe(201);
    const version = JSON.parse(response.body) as {
      id: string;
      versionNumber: number;
      status: string;
    };
    versionTwoId = version.id;
    expect(version).toMatchObject({ versionNumber: 2, status: "draft" });
  });

  it("keeps the database boundary from attaching an offering to the new draft", async () => {
    await expect(
      migrationPool.query(
        `INSERT INTO learning_delivery.learning_offerings
           (organization_id, course_version_id, slug, name, delivery_mode, created_by_user_id)
         VALUES ($1, $2, $3, $4, 'self_paced', $5)`,
        [
          organizationId,
          versionTwoId,
          `db-draft-${randomUUID()}`,
          "Invalid draft offering",
          ownerUserId
        ]
      )
    ).rejects.toMatchObject({ code: "23514" });
  });

  it("creates a self-paced offering from the immutable published version", async () => {
    const response = await app.inject({
      method: "POST",
      url: `/v1/organizations/${organizationId}/offerings`,
      headers: { "x-test-user-id": ownerUserId },
      payload: {
        courseVersionId: versionOneId,
        slug: offeringSlug,
        name: "Frontend Self-paced 2026",
        deliveryMode: "self_paced"
      }
    });

    expect(response.statusCode).toBe(201);
    const offering = JSON.parse(response.body) as {
      id: string;
      courseVersionId: string;
      deliveryMode: string;
      status: string;
      startsAt: string | null;
      endsAt: string | null;
    };
    offeringId = offering.id;
    expect(offering).toMatchObject({
      courseVersionId: versionOneId,
      deliveryMode: "self_paced",
      status: "open",
      startsAt: null,
      endsAt: null
    });
  });

  it("lets an organization learner read course and offering but not manage them", async () => {
    const course = await app.inject({
      method: "GET",
      url: `/v1/organizations/${organizationId}/courses/${courseId}`,
      headers: { "x-test-user-id": learnerUserId }
    });
    const offering = await app.inject({
      method: "GET",
      url: `/v1/organizations/${organizationId}/offerings/${offeringId}`,
      headers: { "x-test-user-id": learnerUserId }
    });

    expect(course.statusCode).toBe(200);
    expect(offering.statusCode).toBe(200);
  });

  it("enrolls only an active organization member into the offering", async () => {
    const enrolled = await app.inject({
      method: "POST",
      url: `/v1/organizations/${organizationId}/offerings/${offeringId}/enrollments`,
      headers: { "x-test-user-id": ownerUserId },
      payload: { userId: learnerUserId }
    });

    expect(enrolled.statusCode).toBe(201);
    expect(JSON.parse(enrolled.body)).toMatchObject({
      organizationId,
      offeringId,
      userId: learnerUserId,
      status: "active"
    });

    const duplicate = await app.inject({
      method: "POST",
      url: `/v1/organizations/${organizationId}/offerings/${offeringId}/enrollments`,
      headers: { "x-test-user-id": ownerUserId },
      payload: { userId: learnerUserId }
    });
    expect(duplicate.statusCode).toBe(409);

    const outsider = await app.inject({
      method: "POST",
      url: `/v1/organizations/${organizationId}/offerings/${offeringId}/enrollments`,
      headers: { "x-test-user-id": ownerUserId },
      payload: { userId: outsiderUserId }
    });
    expect(outsider.statusCode).toBe(409);
  });

  it("records the catalog and delivery mutations in the transactional outbox", async () => {
    const result = await migrationPool.query<EventRow>(
      `SELECT event_name
         FROM events.outbox
        WHERE organization_id = $1
          AND event_name IN (
            'course.created',
            'course_version.created',
            'course_version.published',
            'learning_offering.created',
            'enrollment.created'
          )`,
      [organizationId]
    );
    const names = result.rows.map((row) => row.event_name);

    expect(names).toContain("course.created");
    expect(
      names.filter((name) => name === "course_version.created")
    ).toHaveLength(2);
    expect(names).toContain("course_version.published");
    expect(names).toContain("learning_offering.created");
    expect(names).toContain("enrollment.created");
  });
});
