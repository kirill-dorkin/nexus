import { randomUUID } from "node:crypto";

import type { NestFastifyApplication } from "@nestjs/platform-fastify";
import { createDatabasePool, withTransaction } from "@platform/database";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createApiApplication } from "./app.factory";
import {
  attachPlatformPrincipal,
  type PlatformPrincipalCarrier
} from "./request-context/platform-principal";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (value === undefined || value.trim().length === 0) {
    throw new Error(`${name} is required for API integration tests.`);
  }
  return value;
}

type IdRow = { id: string };

type HeaderValue = string | string[] | undefined;

function firstHeaderValue(value: HeaderValue): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function cookiePair(setCookie: HeaderValue): string {
  const value = firstHeaderValue(setCookie);
  if (value === undefined) {
    throw new Error("Expected authentication response to set a session cookie.");
  }

  const pair = value.split(";", 1)[0];
  if (pair === undefined || pair.length === 0) {
    throw new Error("Expected a non-empty session cookie pair.");
  }
  return pair;
}

describe("Foundation 1 HTTP API", () => {
  const migrationPool = createDatabasePool(
    requireEnv("DATABASE_MIGRATION_URL"),
    { applicationName: "api-http-integration-fixtures" }
  );
  const createdUserIds: string[] = [];

  let app: NestFastifyApplication;
  let ownerUserId = "";
  let outsiderUserId = "";
  let organizationId = "";
  let registeredUserId = "";
  let registeredCookie = "";
  const organizationSlug = `http-${randomUUID()}`;
  const registeredEmail = `Auth-${randomUUID()}@Example.test`;
  const registeredPassword = "a correct integration passphrase";

  async function createUser(label: string): Promise<string> {
    const result = await migrationPool.query<IdRow>(
      `INSERT INTO identity.users (email, display_name)
       VALUES ($1, $2)
       RETURNING id::text`,
      [`${label}-${randomUUID()}@example.test`, label]
    );
    const id = result.rows[0]?.id;
    if (id === undefined) {
      throw new Error("Failed to create HTTP integration-test identity user.");
    }
    createdUserIds.push(id);
    return id;
  }

  beforeAll(async () => {
    ownerUserId = await createUser("http-owner");
    outsiderUserId = await createUser("http-outsider");

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

  it("does not invent a principal from an ordinary production request", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/v1/me"
    });

    expect(response.statusCode).toBe(401);
  });

  it("registers an identity and issues a hardened opaque session cookie", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/v1/auth/register",
      payload: {
        email: ` ${registeredEmail} `,
        password: registeredPassword,
        displayName: " Auth Learner "
      }
    });

    expect(response.statusCode).toBe(201);
    const body = JSON.parse(response.body) as {
      id: string;
      email: string;
      displayName: string;
      status: string;
    };
    registeredUserId = body.id;
    createdUserIds.push(registeredUserId);
    expect(body).toMatchObject({
      email: registeredEmail.toLowerCase(),
      displayName: "Auth Learner",
      status: "active"
    });

    const setCookie = firstHeaderValue(response.headers["set-cookie"]);
    expect(setCookie).toContain("__Host-id=");
    expect(setCookie).toContain("Path=/");
    expect(setCookie).toContain("HttpOnly");
    expect(setCookie).toContain("Secure");
    expect(setCookie).toContain("SameSite=Strict");
    expect(setCookie).not.toContain("Domain=");
    expect(response.headers["cache-control"]).toBe("no-store");
    registeredCookie = cookiePair(response.headers["set-cookie"]);
  });

  it("authenticates the current identity from the server-side session", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/v1/me",
      headers: { cookie: registeredCookie }
    });

    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body)).toMatchObject({
      id: registeredUserId,
      email: registeredEmail.toLowerCase(),
      status: "active"
    });
    expect(response.headers["cache-control"]).toBe("no-store");
  });

  it("does not reveal whether login failed because the account is unknown", async () => {
    const wrongPassword = await app.inject({
      method: "POST",
      url: "/v1/auth/login",
      payload: {
        email: registeredEmail,
        password: "a wrong but sufficiently long password"
      }
    });
    const unknownEmail = await app.inject({
      method: "POST",
      url: "/v1/auth/login",
      payload: {
        email: `missing-${randomUUID()}@example.test`,
        password: "a wrong but sufficiently long password"
      }
    });

    expect(wrongPassword.statusCode).toBe(401);
    expect(unknownEmail.statusCode).toBe(401);
    expect(JSON.parse(wrongPassword.body)).toEqual(JSON.parse(unknownEmail.body));
  });

  it("revokes the server-side session on logout", async () => {
    const logout = await app.inject({
      method: "POST",
      url: "/v1/auth/logout",
      headers: { cookie: registeredCookie }
    });

    expect(logout.statusCode).toBe(204);
    expect(firstHeaderValue(logout.headers["set-cookie"])).toContain("Max-Age=0");

    const afterLogout = await app.inject({
      method: "GET",
      url: "/v1/me",
      headers: { cookie: registeredCookie }
    });
    expect(afterLogout.statusCode).toBe(401);
  });

  it("rejects an expired server-side session", async () => {
    const login = await app.inject({
      method: "POST",
      url: "/v1/auth/login",
      payload: {
        email: registeredEmail,
        password: registeredPassword
      }
    });
    expect(login.statusCode).toBe(200);
    const cookie = cookiePair(login.headers["set-cookie"]);

    await migrationPool.query(
      `UPDATE identity.sessions
          SET expires_at = created_at + interval '1 millisecond'
        WHERE user_id = $1
          AND revoked_at IS NULL`,
      [registeredUserId]
    );

    const response = await app.inject({
      method: "GET",
      url: "/v1/me",
      headers: { cookie }
    });
    expect(response.statusCode).toBe(401);
  });

  it("does not authenticate a suspended identity even with a valid session", async () => {
    const login = await app.inject({
      method: "POST",
      url: "/v1/auth/login",
      payload: {
        email: registeredEmail,
        password: registeredPassword
      }
    });
    expect(login.statusCode).toBe(200);
    const cookie = cookiePair(login.headers["set-cookie"]);

    await migrationPool.query(
      `UPDATE identity.users
          SET status = 'suspended', updated_at = now()
        WHERE id = $1`,
      [registeredUserId]
    );

    const response = await app.inject({
      method: "GET",
      url: "/v1/me",
      headers: { cookie }
    });
    const loginAgain = await app.inject({
      method: "POST",
      url: "/v1/auth/login",
      payload: {
        email: registeredEmail,
        password: registeredPassword
      }
    });

    expect(response.statusCode).toBe(401);
    expect(loginAgain.statusCode).toBe(401);
  });

  it("returns the authenticated active identity from the test-only principal hook", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/v1/me",
      headers: { "x-test-user-id": ownerUserId }
    });

    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body)).toMatchObject({
      id: ownerUserId,
      displayName: "http-owner",
      status: "active"
    });
  });

  it("rejects legacy Organization creation for active users and unauthenticated requests", async () => {
    const rejectedSlug = `disallowed-${randomUUID()}`;
    for (const userId of [ownerUserId, outsiderUserId]) {
      const rejected = await app.inject({
        method: "POST",
        url: "/v1/organizations",
        headers: { "x-test-user-id": userId },
        payload: { slug: rejectedSlug, name: "Unauthorized academy" }
      });
      expect(rejected.statusCode).toBe(403);
    }
    const anonymous = await app.inject({
      method: "POST",
      url: "/v1/organizations",
      payload: { slug: rejectedSlug, name: "Unauthorized academy" }
    });
    expect(anonymous.statusCode).toBe(401);
    const persisted = await migrationPool.query<{ count: string }>(
      "SELECT count(*)::text AS count FROM organizations.organizations WHERE slug=$1",
      [rejectedSlug]
    );
    expect(persisted.rows[0]?.count).toBe("0");
  });

  it("reads an Organization provisioned only through the trusted operator boundary", async () => {
    organizationId = await withTransaction(migrationPool, async ({ client }) => {
      const result = await client.query<{ id: string }>(
        "INSERT INTO organizations.organizations (slug,name,created_by_user_id) VALUES ($1,$2,$3) RETURNING id::text",
        [organizationSlug, "HTTP Learning", ownerUserId]
      );
      const id = result.rows[0]!.id;
      await client.query(
        "INSERT INTO organizations.memberships (organization_id,user_id,status,joined_at) VALUES ($1,$2,'active',now())",
        [id, ownerUserId]
      );
      await client.query(
        "INSERT INTO access_control.role_assignments (organization_id,user_id,role_id,scope_type,scope_id,assigned_by_user_id) SELECT $1,$2,id,'organization',$1,$2 FROM access_control.roles WHERE key='organization_owner' AND is_system=true",
        [id, ownerUserId]
      );
      await client.query(
        "INSERT INTO events.outbox (organization_id,event_name,event_version,aggregate_type,aggregate_id,actor_user_id,payload) VALUES ($1,'organization.created',1,'organization',$1,$2,$3::jsonb)",
        [id, ownerUserId, JSON.stringify({ organizationId: id, slug: organizationSlug, name: "HTTP Learning", createdByUserId: ownerUserId })]
      );
      return id;
    });

    const getResponse = await app.inject({
      method: "GET",
      url: `/v1/organizations/${organizationId}`,
      headers: { "x-test-user-id": ownerUserId }
    });

    expect(getResponse.statusCode).toBe(200);
    expect(JSON.parse(getResponse.body)).toEqual({
      id: organizationId,
      slug: organizationSlug,
      name: "HTTP Learning",
      status: "active"
    });
  });

  it("rejects an active user without an organization role", async () => {
    const response = await app.inject({
      method: "GET",
      url: `/v1/organizations/${organizationId}`,
      headers: { "x-test-user-id": outsiderUserId }
    });

    expect(response.statusCode).toBe(403);
  });

  it("rejects an existing slug without revealing ownership or creating duplicates", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/v1/organizations",
      headers: { "x-test-user-id": outsiderUserId },
      payload: { slug: organizationSlug, name: "Duplicate" }
    });
    expect(response.statusCode).toBe(403);
  });
});
