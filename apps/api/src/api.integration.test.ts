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
    throw new Error(`${name} is required for API integration tests.`);
  }
  return value;
}

type IdRow = { id: string };

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
  const organizationSlug = `http-${randomUUID()}`;

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

  it("returns the authenticated active identity", async () => {
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

  it("validates organization input at the HTTP boundary", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/v1/organizations",
      headers: { "x-test-user-id": ownerUserId },
      payload: {
        slug: "Invalid Slug",
        name: "HTTP Learning"
      }
    });

    expect(response.statusCode).toBe(400);
  });

  it("creates and reads an organization for its owner", async () => {
    const createResponse = await app.inject({
      method: "POST",
      url: "/v1/organizations",
      headers: { "x-test-user-id": ownerUserId },
      payload: {
        slug: organizationSlug,
        name: "HTTP Learning"
      }
    });

    expect(createResponse.statusCode).toBe(201);
    const created = JSON.parse(createResponse.body) as {
      id: string;
      slug: string;
      name: string;
      status: string;
    };
    organizationId = created.id;
    expect(created).toMatchObject({
      slug: organizationSlug,
      name: "HTTP Learning",
      status: "active"
    });

    const getResponse = await app.inject({
      method: "GET",
      url: `/v1/organizations/${organizationId}`,
      headers: { "x-test-user-id": ownerUserId }
    });

    expect(getResponse.statusCode).toBe(200);
    expect(JSON.parse(getResponse.body)).toEqual(created);
  });

  it("rejects an active user without an organization role", async () => {
    const response = await app.inject({
      method: "GET",
      url: `/v1/organizations/${organizationId}`,
      headers: { "x-test-user-id": outsiderUserId }
    });

    expect(response.statusCode).toBe(403);
  });

  it("maps duplicate organization slugs to conflict", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/v1/organizations",
      headers: { "x-test-user-id": ownerUserId },
      payload: {
        slug: organizationSlug,
        name: "Duplicate"
      }
    });

    expect(response.statusCode).toBe(409);
  });
});
