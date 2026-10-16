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
    throw new Error(`${name} is required for membership integration tests.`);
  }
  return value;
}

type IdRow = { id: string };

describe("organization membership HTTP lifecycle", () => {
  const migrationPool = createDatabasePool(
    requireEnv("DATABASE_MIGRATION_URL"),
    { applicationName: "membership-http-integration-fixtures" }
  );

  let app: NestFastifyApplication;
  let ownerUserId = "";
  let memberUserId = "";
  let leaverUserId = "";
  let organizationId = "";
  const createdUserIds: string[] = [];
  const organizationSlug = `members-${randomUUID()}`;

  async function createUser(label: string): Promise<string> {
    const result = await migrationPool.query<IdRow>(
      `INSERT INTO identity.users (email, display_name)
       VALUES ($1, $2)
       RETURNING id::text`,
      [`${label}-${randomUUID()}@example.test`, label]
    );
    const id = result.rows[0]?.id;
    if (id === undefined) {
      throw new Error("Failed to create membership integration-test user.");
    }
    createdUserIds.push(id);
    return id;
  }

  beforeAll(async () => {
    ownerUserId = await createUser("membership-owner");
    memberUserId = await createUser("membership-member");
    leaverUserId = await createUser("membership-leaver");

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
        slug: organizationSlug,
        name: "Membership lifecycle"
      })).id;
  });

  afterAll(async () => {
    if (app !== undefined) {
      await app.close();
    }

    if (createdUserIds.length > 0) {
      await migrationPool.query(
        `DELETE FROM events.outbox
          WHERE actor_user_id = ANY($1::uuid[])`,
        [createdUserIds]
      );
      await migrationPool.query(
        `DELETE FROM organizations.organizations
          WHERE created_by_user_id = ANY($1::uuid[])`,
        [createdUserIds]
      );
      await migrationPool.query(
        `DELETE FROM identity.users
          WHERE id = ANY($1::uuid[])`,
        [createdUserIds]
      );
    }

    await migrationPool.end();
  });

  it("does not grant organization access merely because an identity exists", async () => {
    const response = await app.inject({
      method: "GET",
      url: `/v1/organizations/${organizationId}`,
      headers: { "x-test-user-id": memberUserId }
    });

    expect(response.statusCode).toBe(403);
  });

  it("lets an owner invite an existing active identity without granting a role", async () => {
    const response = await app.inject({
      method: "POST",
      url: `/v1/organizations/${organizationId}/memberships`,
      headers: { "x-test-user-id": ownerUserId },
      payload: { userId: memberUserId }
    });

    expect(response.statusCode).toBe(201);
    expect(JSON.parse(response.body)).toMatchObject({
      organizationId,
      userId: memberUserId,
      status: "invited",
      joinedAt: null
    });

    const roleBeforeAccept = await app.inject({
      method: "POST",
      url: `/v1/organizations/${organizationId}/role-assignments`,
      headers: { "x-test-user-id": ownerUserId },
      payload: {
        userId: memberUserId,
        roleKey: "learner",
        scope: { type: "organization", id: organizationId }
      }
    });
    expect(roleBeforeAccept.statusCode).toBe(409);
  });

  it("lets only the invited identity activate its own membership", async () => {
    const response = await app.inject({
      method: "POST",
      url: `/v1/organizations/${organizationId}/memberships/me/accept`,
      headers: { "x-test-user-id": memberUserId }
    });

    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body)).toMatchObject({
      organizationId,
      userId: memberUserId,
      status: "active"
    });
    expect((JSON.parse(response.body) as { joinedAt: string }).joinedAt).toEqual(
      expect.any(String)
    );
  });

  it("allows role assignment only after membership is active", async () => {
    const assign = await app.inject({
      method: "POST",
      url: `/v1/organizations/${organizationId}/role-assignments`,
      headers: { "x-test-user-id": ownerUserId },
      payload: {
        userId: memberUserId,
        roleKey: "learner",
        scope: { type: "organization", id: organizationId }
      }
    });
    expect(assign.statusCode).toBe(204);

    const read = await app.inject({
      method: "GET",
      url: `/v1/organizations/${organizationId}`,
      headers: { "x-test-user-id": memberUserId }
    });
    expect(read.statusCode).toBe(200);
  });

  it("does not let a learner manage memberships or create phantom child-resource roles", async () => {
    const inviteAsLearner = await app.inject({
      method: "POST",
      url: `/v1/organizations/${organizationId}/memberships`,
      headers: { "x-test-user-id": memberUserId },
      payload: { userId: leaverUserId }
    });
    expect(inviteAsLearner.statusCode).toBe(403);

    const childScopeRole = await app.inject({
      method: "POST",
      url: `/v1/organizations/${organizationId}/role-assignments`,
      headers: { "x-test-user-id": ownerUserId },
      payload: {
        userId: memberUserId,
        roleKey: "mentor",
        scope: { type: "course", id: randomUUID() }
      }
    });
    expect(childScopeRole.statusCode).toBe(400);
  });

  it("supports leaving an active membership and reinviting the same identity", async () => {
    const invite = await app.inject({
      method: "POST",
      url: `/v1/organizations/${organizationId}/memberships`,
      headers: { "x-test-user-id": ownerUserId },
      payload: { userId: leaverUserId }
    });
    expect(invite.statusCode).toBe(201);

    const accept = await app.inject({
      method: "POST",
      url: `/v1/organizations/${organizationId}/memberships/me/accept`,
      headers: { "x-test-user-id": leaverUserId }
    });
    expect(accept.statusCode).toBe(200);

    const leave = await app.inject({
      method: "POST",
      url: `/v1/organizations/${organizationId}/memberships/me/leave`,
      headers: { "x-test-user-id": leaverUserId }
    });
    expect(leave.statusCode).toBe(200);
    expect(JSON.parse(leave.body)).toMatchObject({
      userId: leaverUserId,
      status: "left"
    });

    const reinvite = await app.inject({
      method: "POST",
      url: `/v1/organizations/${organizationId}/memberships`,
      headers: { "x-test-user-id": ownerUserId },
      payload: { userId: leaverUserId }
    });
    expect(reinvite.statusCode).toBe(201);
    expect(JSON.parse(reinvite.body)).toMatchObject({
      userId: leaverUserId,
      status: "invited",
      joinedAt: null
    });
  });

  it("protects organization ownership from the incomplete membership lifecycle", async () => {
    const suspendSelf = await app.inject({
      method: "POST",
      url: `/v1/organizations/${organizationId}/memberships/${ownerUserId}/suspend`,
      headers: { "x-test-user-id": ownerUserId }
    });
    expect(suspendSelf.statusCode).toBe(400);

    const leave = await app.inject({
      method: "POST",
      url: `/v1/organizations/${organizationId}/memberships/me/leave`,
      headers: { "x-test-user-id": ownerUserId }
    });
    expect(leave.statusCode).toBe(409);
  });

  it("removes authorization immediately when an active membership is suspended", async () => {
    const suspend = await app.inject({
      method: "POST",
      url: `/v1/organizations/${organizationId}/memberships/${memberUserId}/suspend`,
      headers: { "x-test-user-id": ownerUserId }
    });
    expect(suspend.statusCode).toBe(200);
    expect(JSON.parse(suspend.body)).toMatchObject({
      userId: memberUserId,
      status: "suspended"
    });

    const read = await app.inject({
      method: "GET",
      url: `/v1/organizations/${organizationId}`,
      headers: { "x-test-user-id": memberUserId }
    });
    expect(read.statusCode).toBe(403);

    const roleWhileSuspended = await app.inject({
      method: "POST",
      url: `/v1/organizations/${organizationId}/role-assignments`,
      headers: { "x-test-user-id": ownerUserId },
      payload: {
        userId: memberUserId,
        roleKey: "mentor",
        scope: { type: "organization", id: organizationId }
      }
    });
    expect(roleWhileSuspended.statusCode).toBe(409);
  });
});
