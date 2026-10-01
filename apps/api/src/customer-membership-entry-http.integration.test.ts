import { randomUUID } from "node:crypto";

import type { NestFastifyApplication } from "@nestjs/platform-fastify";
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
    throw new Error(`${name} is required for customer entry integration tests.`);
  }
  return value;
}

type IdRow = { id: string };
type CountRow = { count: string };

describe("customer Organization membership entry", () => {
  const migrationPool = createDatabasePool(
    requireEnv("DATABASE_MIGRATION_URL"),
    { applicationName: "customer-membership-entry-integration-fixtures" }
  );

  let app: NestFastifyApplication;
  let ownerUserId = "";
  let customerUserId = "";
  let invitedUserId = "";
  let leftUserId = "";
  let suspendedUserId = "";
  let organizationId = "";
  const organizationSlug = `customer-entry-${randomUUID()}`;
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
      throw new Error("Failed to create customer-entry test user.");
    }
    createdUserIds.push(id);
    return id;
  }

  function userHeaders(userId: string) {
    return { "x-test-user-id": userId };
  }

  beforeAll(async () => {
    ownerUserId = await createUser("customer-entry-owner");
    customerUserId = await createUser("customer-entry-customer");
    invitedUserId = await createUser("customer-entry-invited");
    leftUserId = await createUser("customer-entry-left");
    suspendedUserId = await createUser("customer-entry-suspended");

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

    const create = await app.inject({
      method: "POST",
      url: "/v1/organizations",
      headers: userHeaders(ownerUserId),
      payload: {
        slug: organizationSlug,
        name: "Customer entry organization"
      }
    });
    if (create.statusCode !== 201) {
      throw new Error(`Failed to create customer-entry organization: ${create.body}`);
    }
    organizationId = (JSON.parse(create.body) as { id: string }).id;
  });

  afterAll(async () => {
    if (app !== undefined) {
      await app.close();
    }
    if (createdUserIds.length > 0) {
      await migrationPool.query(
        `DELETE FROM events.outbox WHERE actor_user_id = ANY($1::uuid[])`,
        [createdUserIds]
      );
      await migrationPool.query(
        `DELETE FROM organizations.organizations WHERE created_by_user_id = ANY($1::uuid[])`,
        [createdUserIds]
      );
      await migrationPool.query(
        `DELETE FROM identity.users WHERE id = ANY($1::uuid[])`,
        [createdUserIds]
      );
    }
    await migrationPool.end();
  });

  it("defaults new Organizations to closed customer entry", async () => {
    const result = await migrationPool.query<{ customer_entry_policy: string }>(
      `SELECT customer_entry_policy
         FROM organizations.organizations
        WHERE id = $1`,
      [organizationId]
    );
    expect(result.rows[0]?.customer_entry_policy).toBe("closed");

    const join = await app.inject({
      method: "POST",
      url: `/v1/public/organizations/${organizationSlug}/memberships/me`,
      headers: userHeaders(customerUserId)
    });
    expect(join.statusCode).toBe(404);
  });

  it("requires authentication even when an Organization is open", async () => {
    const open = await app.inject({
      method: "PUT",
      url: `/v1/organizations/${organizationId}/customer-entry-policy`,
      headers: userHeaders(ownerUserId),
      payload: { policy: "open" }
    });
    expect(open.statusCode).toBe(200);
    expect(JSON.parse(open.body)).toEqual({ policy: "open" });

    const join = await app.inject({
      method: "POST",
      url: `/v1/public/organizations/${organizationSlug}/memberships/me`
    });
    expect(join.statusCode).toBe(401);
  });

  it("creates one active Membership by slug without granting a role", async () => {
    const join = await app.inject({
      method: "POST",
      url: `/v1/public/organizations/${organizationSlug}/memberships/me`,
      headers: userHeaders(customerUserId)
    });
    expect(join.statusCode).toBe(200);
    expect(JSON.parse(join.body)).toMatchObject({
      organizationId,
      userId: customerUserId,
      status: "active"
    });

    const memberships = await migrationPool.query<CountRow>(
      `SELECT count(*)::text AS count
         FROM organizations.memberships
        WHERE organization_id = $1
          AND user_id = $2`,
      [organizationId, customerUserId]
    );
    expect(memberships.rows[0]?.count).toBe("1");

    const roles = await migrationPool.query<CountRow>(
      `SELECT count(*)::text AS count
         FROM access_control.role_assignments
        WHERE organization_id = $1
          AND user_id = $2`,
      [organizationId, customerUserId]
    );
    expect(roles.rows[0]?.count).toBe("0");
  });

  it("is idempotent for an already-active Membership", async () => {
    const first = await app.inject({
      method: "POST",
      url: `/v1/public/organizations/${organizationSlug}/memberships/me`,
      headers: userHeaders(customerUserId)
    });
    const second = await app.inject({
      method: "POST",
      url: `/v1/public/organizations/${organizationSlug}/memberships/me`,
      headers: userHeaders(customerUserId)
    });

    expect(first.statusCode).toBe(200);
    expect(second.statusCode).toBe(200);
    expect(JSON.parse(second.body).id).toBe(JSON.parse(first.body).id);
  });

  it("does not let ordinary members change the Organization entry policy", async () => {
    const response = await app.inject({
      method: "PUT",
      url: `/v1/organizations/${organizationId}/customer-entry-policy`,
      headers: userHeaders(customerUserId),
      payload: { policy: "closed" }
    });
    expect(response.statusCode).toBe(403);
  });

  it("does not bypass invited, left, or suspended Membership lifecycle", async () => {
    const invite = await app.inject({
      method: "POST",
      url: `/v1/organizations/${organizationId}/memberships`,
      headers: userHeaders(ownerUserId),
      payload: { userId: invitedUserId }
    });
    expect(invite.statusCode).toBe(201);

    await migrationPool.query(
      `INSERT INTO organizations.memberships
         (organization_id, user_id, status, joined_at)
       VALUES
         ($1, $2, 'left', now()),
         ($1, $3, 'suspended', now())`,
      [organizationId, leftUserId, suspendedUserId]
    );

    for (const userId of [invitedUserId, leftUserId, suspendedUserId]) {
      const join = await app.inject({
        method: "POST",
        url: `/v1/public/organizations/${organizationSlug}/memberships/me`,
        headers: userHeaders(userId)
      });
      expect(join.statusCode).toBe(409);
    }
  });

  it("revalidates policy at write time after the Organization closes entry", async () => {
    const close = await app.inject({
      method: "PUT",
      url: `/v1/organizations/${organizationId}/customer-entry-policy`,
      headers: userHeaders(ownerUserId),
      payload: { policy: "closed" }
    });
    expect(close.statusCode).toBe(200);

    const freshUserId = await createUser("customer-entry-after-close");
    const join = await app.inject({
      method: "POST",
      url: `/v1/public/organizations/${organizationSlug}/memberships/me`,
      headers: userHeaders(freshUserId)
    });
    expect(join.statusCode).toBe(404);
  });
});
