import { randomUUID } from "node:crypto";

import type { NestFastifyApplication } from "@nestjs/platform-fastify";
import {
  entitlementSchema,
  learningOfferingSchema
} from "@platform/contracts";
import { createDatabasePool } from "@platform/database";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createApiApplication } from "./app.factory";
import {
  attachPlatformPrincipal,
  type PlatformPrincipalCarrier
} from "./request-context/platform-principal";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (value === undefined || value.trim().length === 0) {
    throw new Error(`${name} is required for commerce integration tests.`);
  }
  return value;
}

type IdRow = { id: string };
type EventRow = { event_name: string };
type EnrollmentRow = { status: string };
type PrivilegeRow = { can_delete_entitlements: boolean };

describe("commerce entitlement and enrollment access HTTP lifecycle", () => {
  const migrationPool = createDatabasePool(
    requireEnv("DATABASE_MIGRATION_URL"),
    { applicationName: "commerce-http-integration-fixtures" }
  );

  let app: NestFastifyApplication;
  let ownerUserId = "";
  let instructorUserId = "";
  let learnerUserId = "";
  let secondLearnerUserId = "";
  let organizationId = "";
  let courseId = "";
  let courseVersionId = "";
  let restrictedOfferingId = "";
  let membershipOfferingId = "";
  let learnerEntitlementId = "";
  let secondEntitlementId = "";
  let learnerEnrollmentId = "";
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
      throw new Error("Failed to create commerce integration-test identity.");
    }
    createdUserIds.push(id);
    return id;
  }

  async function addMember(userId: string, roleKey: "instructor" | "learner") {
    const invite = await app.inject({
      method: "POST",
      url: `/v1/organizations/${organizationId}/memberships`,
      headers: { "x-test-user-id": ownerUserId },
      payload: { userId }
    });
    if (invite.statusCode !== 201) {
      throw new Error(`Failed to invite commerce test member: ${invite.body}`);
    }

    const accept = await app.inject({
      method: "POST",
      url: `/v1/organizations/${organizationId}/memberships/me/accept`,
      headers: { "x-test-user-id": userId }
    });
    if (accept.statusCode !== 200) {
      throw new Error(`Failed to activate commerce test member: ${accept.body}`);
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
      throw new Error(`Failed to assign commerce test role: ${role.body}`);
    }
  }

  beforeAll(async () => {
    ownerUserId = await createUser("commerce-owner");
    instructorUserId = await createUser("commerce-instructor");
    learnerUserId = await createUser("commerce-learner");
    secondLearnerUserId = await createUser("commerce-second-learner");

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
        slug: `commerce-${randomUUID()}`,
        name: "Commerce integration"
      }
    });
    if (organization.statusCode !== 201) {
      throw new Error(`Failed to create commerce test organization: ${organization.body}`);
    }
    organizationId = (JSON.parse(organization.body) as { id: string }).id;

    await addMember(instructorUserId, "instructor");
    await addMember(learnerUserId, "learner");
    await addMember(secondLearnerUserId, "learner");

    const course = await app.inject({
      method: "POST",
      url: `/v1/organizations/${organizationId}/courses`,
      headers: { "x-test-user-id": ownerUserId },
      payload: {
        slug: `commerce-course-${randomUUID()}`,
        title: "Entitlement-gated learning"
      }
    });
    if (course.statusCode !== 201) {
      throw new Error(`Failed to create commerce test course: ${course.body}`);
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
      throw new Error(`Failed to publish commerce test course: ${publish.body}`);
    }

    const restricted = await app.inject({
      method: "POST",
      url: `/v1/organizations/${organizationId}/offerings`,
      headers: { "x-test-user-id": ownerUserId },
      payload: {
        courseVersionId,
        slug: `restricted-${randomUUID()}`,
        name: "Restricted offering",
        deliveryMode: "self_paced",
        accessMode: "entitlement_required"
      }
    });
    if (restricted.statusCode !== 201) {
      throw new Error(`Failed to create restricted offering: ${restricted.body}`);
    }
    restrictedOfferingId = learningOfferingSchema.parse(
      JSON.parse(restricted.body)
    ).id;

    const membership = await app.inject({
      method: "POST",
      url: `/v1/organizations/${organizationId}/offerings`,
      headers: { "x-test-user-id": ownerUserId },
      payload: {
        courseVersionId,
        slug: `membership-${randomUUID()}`,
        name: "Membership offering",
        deliveryMode: "self_paced"
      }
    });
    if (membership.statusCode !== 201) {
      throw new Error(`Failed to create membership offering: ${membership.body}`);
    }
    const membershipOffering = learningOfferingSchema.parse(
      JSON.parse(membership.body)
    );
    membershipOfferingId = membershipOffering.id;
    expect(membershipOffering.accessMode).toBe("membership");
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
        `DELETE FROM commerce.entitlements WHERE organization_id = $1`,
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

  it("does not let enrollment authorization manufacture an entitlement", async () => {
    const instructorGrant = await app.inject({
      method: "POST",
      url: `/v1/organizations/${organizationId}/offerings/${restrictedOfferingId}/entitlements`,
      headers: { "x-test-user-id": instructorUserId },
      payload: { userId: learnerUserId }
    });
    expect(instructorGrant.statusCode).toBe(403);

    const enrollment = await app.inject({
      method: "POST",
      url: `/v1/organizations/${organizationId}/offerings/${restrictedOfferingId}/enrollments`,
      headers: { "x-test-user-id": instructorUserId },
      payload: { userId: learnerUserId }
    });
    expect(enrollment.statusCode).toBe(409);
  });

  it("rejects already-expired grants at the HTTP application boundary", async () => {
    const response = await app.inject({
      method: "POST",
      url: `/v1/organizations/${organizationId}/offerings/${restrictedOfferingId}/entitlements`,
      headers: { "x-test-user-id": ownerUserId },
      payload: {
        userId: learnerUserId,
        expiresAt: "2020-01-01T00:00:00.000Z"
      }
    });
    expect(response.statusCode).toBe(400);
  });

  it("grants a stable entitlement independently from enrollment", async () => {
    const first = await app.inject({
      method: "POST",
      url: `/v1/organizations/${organizationId}/offerings/${restrictedOfferingId}/entitlements`,
      headers: { "x-test-user-id": ownerUserId },
      payload: { userId: learnerUserId }
    });
    expect(first.statusCode).toBe(201);
    const firstEntitlement = entitlementSchema.parse(JSON.parse(first.body));
    learnerEntitlementId = firstEntitlement.id;
    expect(firstEntitlement).toMatchObject({
      organizationId,
      offeringId: restrictedOfferingId,
      userId: learnerUserId,
      status: "active",
      expiresAt: null,
      revokedAt: null
    });

    const second = await app.inject({
      method: "POST",
      url: `/v1/organizations/${organizationId}/offerings/${restrictedOfferingId}/entitlements`,
      headers: { "x-test-user-id": ownerUserId },
      payload: {
        userId: learnerUserId,
        expiresAt: "2030-01-01T00:00:00.000Z"
      }
    });
    expect(second.statusCode).toBe(201);
    const regranted = entitlementSchema.parse(JSON.parse(second.body));
    expect(regranted.id).toBe(learnerEntitlementId);
    expect(regranted.expiresAt).toBe("2030-01-01T00:00:00.000Z");

    const count = await migrationPool.query<{ count: string }>(
      `SELECT count(*)::text AS count
         FROM commerce.entitlements
        WHERE organization_id = $1
          AND offering_id = $2
          AND user_id = $3`,
      [organizationId, restrictedOfferingId, learnerUserId]
    );
    expect(count.rows[0]?.count).toBe("1");
  });

  it("uses an effective entitlement as an enrollment gate, not as enrollment itself", async () => {
    const response = await app.inject({
      method: "POST",
      url: `/v1/organizations/${organizationId}/offerings/${restrictedOfferingId}/enrollments`,
      headers: { "x-test-user-id": instructorUserId },
      payload: { userId: learnerUserId }
    });
    expect(response.statusCode).toBe(201);
    const enrollment = JSON.parse(response.body) as {
      id: string;
      offeringId: string;
      userId: string;
      status: string;
    };
    learnerEnrollmentId = enrollment.id;
    expect(enrollment).toMatchObject({
      offeringId: restrictedOfferingId,
      userId: learnerUserId,
      status: "active"
    });
  });

  it("revokes access without rewriting an existing enrollment", async () => {
    const revoke = await app.inject({
      method: "POST",
      url: `/v1/organizations/${organizationId}/offerings/${restrictedOfferingId}/entitlements/${learnerEntitlementId}/revoke`,
      headers: { "x-test-user-id": ownerUserId }
    });
    expect(revoke.statusCode).toBe(200);
    expect(entitlementSchema.parse(JSON.parse(revoke.body)).status).toBe("revoked");

    const persistedEnrollment = await migrationPool.query<EnrollmentRow>(
      `SELECT status
         FROM learning_delivery.enrollments
        WHERE organization_id = $1
          AND id = $2`,
      [organizationId, learnerEnrollmentId]
    );
    expect(persistedEnrollment.rows[0]?.status).toBe("active");
  });

  it("does not let a revoked entitlement authorize a new enrollment", async () => {
    const grant = await app.inject({
      method: "POST",
      url: `/v1/organizations/${organizationId}/offerings/${restrictedOfferingId}/entitlements`,
      headers: { "x-test-user-id": ownerUserId },
      payload: { userId: secondLearnerUserId }
    });
    expect(grant.statusCode).toBe(201);
    secondEntitlementId = entitlementSchema.parse(JSON.parse(grant.body)).id;

    const revoke = await app.inject({
      method: "POST",
      url: `/v1/organizations/${organizationId}/offerings/${restrictedOfferingId}/entitlements/${secondEntitlementId}/revoke`,
      headers: { "x-test-user-id": ownerUserId }
    });
    expect(revoke.statusCode).toBe(200);

    const enrollment = await app.inject({
      method: "POST",
      url: `/v1/organizations/${organizationId}/offerings/${restrictedOfferingId}/enrollments`,
      headers: { "x-test-user-id": instructorUserId },
      payload: { userId: secondLearnerUserId }
    });
    expect(enrollment.statusCode).toBe(409);
  });

  it("keeps free/internal membership offerings independent from Commerce", async () => {
    const enrollment = await app.inject({
      method: "POST",
      url: `/v1/organizations/${organizationId}/offerings/${membershipOfferingId}/enrollments`,
      headers: { "x-test-user-id": instructorUserId },
      payload: { userId: secondLearnerUserId }
    });
    expect(enrollment.statusCode).toBe(201);
  });

  it("keeps entitlement lifecycle events transactional and rows non-deletable by the app role", async () => {
    const events = await migrationPool.query<EventRow>(
      `SELECT event_name
         FROM events.outbox
        WHERE organization_id = $1
          AND event_name IN ('entitlement.granted', 'entitlement.revoked')`,
      [organizationId]
    );
    const names = events.rows.map((row) => row.event_name);
    expect(names.filter((name) => name === "entitlement.granted")).toHaveLength(3);
    expect(names.filter((name) => name === "entitlement.revoked")).toHaveLength(2);

    const privileges = await migrationPool.query<PrivilegeRow>(
      `SELECT has_table_privilege(
                'platform_app',
                'commerce.entitlements',
                'DELETE'
              ) AS can_delete_entitlements`
    );
    expect(privileges.rows[0]?.can_delete_entitlements).toBe(false);
  });
});
