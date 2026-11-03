import { createHash, randomUUID } from "node:crypto";

import type { NestFastifyApplication } from "@nestjs/platform-fastify";
import {
  githubInstallationMappingSchema,
  githubIntegrationSetupSessionSchema,
  githubIntegrationViewSchema
} from "@platform/contracts";
import { createDatabasePool, type DatabasePool } from "@platform/database";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { createApiApplication } from "./app.factory";
import {
  attachPlatformPrincipal,
  type PlatformPrincipalCarrier
} from "./request-context/platform-principal";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (value === undefined || value.trim().length === 0) {
    throw new Error(`${name} is required for GitHub App setup integration tests.`);
  }
  return value;
}

function externalId(): number {
  return 10_000_000_000 + Math.floor(Math.random() * 8_000_000_000);
}

type IdRow = { id: string };
type TestActor = { userId: string; organizationId: string };

describe("trusted GitHub App setup lifecycle", () => {
  const testNamespace = randomUUID();
  const githubAppId = externalId();
  const installationA = externalId();
  const installationB = externalId();
  const accountA = externalId();
  const accountB = externalId();
  const repositoryA1 = externalId();
  const repositoryA2 = externalId();
  const repositoryA3 = externalId();
  const repositoryB = externalId();
  const previousEnv = new Map<string, string | undefined>();
  const configKeys = [
    "GITHUB_APP_ID",
    "GITHUB_APP_SLUG",
    "GITHUB_APP_CLIENT_ID",
    "GITHUB_APP_CLIENT_SECRET",
    "GITHUB_APP_OAUTH_CALLBACK_URL"
  ] as const;

  let migrationPool: DatabasePool;
  let app: NestFastifyApplication;
  let ownerA: TestActor;
  let ownerB: TestActor;
  let adminAUserId = "";
  let instructorAUserId = "";
  const createdUserIds: string[] = [];

  async function createUser(label: string): Promise<string> {
    const result = await migrationPool.query<IdRow>(
      `INSERT INTO identity.users (email, display_name)
       VALUES ($1, $2)
       RETURNING id::text`,
      [`github-setup-${label}-${randomUUID()}@example.test`, `GitHub setup ${label}`]
    );
    const id = result.rows[0]?.id;
    if (id === undefined) throw new Error("Failed to create GitHub setup test user.");
    createdUserIds.push(id);
    return id;
  }

  async function assignRole(
    organizationId: string,
    userId: string,
    roleKey: string,
    assignedByUserId: string
  ): Promise<void> {
    await migrationPool.query(
      `INSERT INTO access_control.role_assignments (
         organization_id, user_id, role_id, scope_type, scope_id, assigned_by_user_id
       )
       SELECT $1, $2, role.id, 'organization', $1, $4
       FROM access_control.roles AS role
       WHERE role.key = $3`,
      [organizationId, userId, roleKey, assignedByUserId]
    );
  }

  async function createTenant(label: string): Promise<TestActor> {
    const userId = await createUser(`${label}-owner`);
    const organization = await migrationPool.query<IdRow>(
      `INSERT INTO organizations.organizations (slug, name, created_by_user_id)
       VALUES ($1, $2, $3)
       RETURNING id::text`,
      [`github-setup-${label}-${randomUUID()}`, `GitHub setup ${label}`, userId]
    );
    const organizationId = organization.rows[0]?.id;
    if (organizationId === undefined) throw new Error("Failed to create GitHub setup test organization.");
    await migrationPool.query(
      `INSERT INTO organizations.memberships (organization_id, user_id, status, joined_at)
       VALUES ($1, $2, 'active', now())`,
      [organizationId, userId]
    );
    await assignRole(organizationId, userId, "organization_owner", userId);
    return { userId, organizationId };
  }

  async function addMember(
    organizationId: string,
    label: string,
    roleKey: "organization_admin" | "instructor",
    assignedByUserId: string
  ): Promise<string> {
    const userId = await createUser(label);
    await migrationPool.query(
      `INSERT INTO organizations.memberships (organization_id, user_id, status, joined_at)
       VALUES ($1, $2, 'active', now())`,
      [organizationId, userId]
    );
    await assignRole(organizationId, userId, roleKey, assignedByUserId);
    return userId;
  }

  function installationPayload(
    installationId: number,
    accountId: number,
    accountLogin: string
  ): Record<string, unknown> {
    return {
      id: installationId,
      app_id: githubAppId,
      account: { id: accountId, login: accountLogin, type: "Organization" },
      repository_selection: "selected",
      permissions: { pull_requests: "read", checks: "read" }
    };
  }

  function tokenForCode(code: string): string | null {
    const tokens: Record<string, string> = {
      "code-owner-initial": "token-owner-initial",
      "code-owner-resync": "token-owner-resync",
      "code-cross": "token-cross",
      "code-inaccessible": "token-inaccessible",
      "code-suspend": "token-suspend"
    };
    return tokens[code] ?? null;
  }

  function installationsForToken(token: string): readonly Record<string, unknown>[] {
    if (["token-owner-initial", "token-owner-resync", "token-cross"].includes(token)) {
      return [installationPayload(installationA, accountA, `acme-${testNamespace}`)];
    }
    if (token === "token-suspend") {
      return [installationPayload(installationB, accountB, `sandbox-${testNamespace}`)];
    }
    return [];
  }

  function repositoriesForToken(token: string): readonly Record<string, unknown>[] {
    if (token === "token-owner-initial" || token === "token-cross") {
      return [
        { id: repositoryA1, full_name: `acme-${testNamespace}/alpha` },
        { id: repositoryA2, full_name: `acme-${testNamespace}/beta` }
      ];
    }
    if (token === "token-owner-resync") {
      return [
        { id: repositoryA2, full_name: `acme-${testNamespace}/beta-renamed` },
        { id: repositoryA3, full_name: `acme-${testNamespace}/gamma` }
      ];
    }
    if (token === "token-suspend") {
      return [{ id: repositoryB, full_name: `sandbox-${testNamespace}/archive` }];
    }
    return [];
  }

  async function startSetup(userId: string, organizationId: string): Promise<string> {
    const response = await app.inject({
      method: "POST",
      url: `/v1/organizations/${organizationId}/integrations/github/setup-sessions`,
      headers: { "x-test-user-id": userId }
    });
    expect(response.statusCode).toBe(201);
    const setup = githubIntegrationSetupSessionSchema.parse(JSON.parse(response.body));
    const state = new URL(setup.installationUrl).searchParams.get("state");
    if (state === null) throw new Error("Installation URL did not contain state.");
    return state;
  }

  async function advanceToOAuth(
    userId: string,
    state: string,
    installationId: number
  ): Promise<string> {
    const response = await app.inject({
      method: "GET",
      url: `/v1/integrations/github/setup/callback?state=${encodeURIComponent(state)}&installation_id=${installationId}&setup_action=install`,
      headers: { "x-test-user-id": userId }
    });
    expect(response.statusCode).toBe(302);
    const location = response.headers.location;
    if (typeof location !== "string") throw new Error("OAuth redirect location is missing.");
    const oauthState = new URL(location).searchParams.get("state");
    if (oauthState === null) throw new Error("OAuth redirect did not contain state.");
    return oauthState;
  }

  function completeSetup(userId: string, oauthState: string, code: string) {
    return app.inject({
      method: "GET",
      url: `/v1/integrations/github/oauth/callback?state=${encodeURIComponent(oauthState)}&code=${encodeURIComponent(code)}`,
      headers: { "x-test-user-id": userId }
    });
  }

  beforeAll(async () => {
    for (const key of configKeys) previousEnv.set(key, process.env[key]);
    process.env.GITHUB_APP_ID = String(githubAppId);
    process.env.GITHUB_APP_SLUG = "platform-test-app";
    process.env.GITHUB_APP_CLIENT_ID = "Iv1.platform-test-client";
    process.env.GITHUB_APP_CLIENT_SECRET = "test-client-secret-never-persist";
    process.env.GITHUB_APP_OAUTH_CALLBACK_URL =
      "http://localhost:4000/v1/integrations/github/oauth/callback";

    vi.stubGlobal("fetch", async (input: string | URL | Request, init?: RequestInit) => {
      const url = input instanceof Request ? input.url : input.toString();
      if (url === "https://github.com/login/oauth/access_token") {
        const body = typeof init?.body === "string"
          ? JSON.parse(init.body) as { code?: string }
          : {};
        const token = tokenForCode(body.code ?? "");
        return new Response(
          JSON.stringify(token === null ? { error: "bad_verification_code" } : { access_token: token }),
          { status: token === null ? 400 : 200, headers: { "content-type": "application/json" } }
        );
      }

      const token = new Headers(init?.headers)
        .get("Authorization")
        ?.replace(/^Bearer /, "") ?? "";
      if (url.startsWith("https://api.github.com/user/installations?")) {
        const installations = installationsForToken(token);
        return new Response(JSON.stringify({ installations }), {
          status: 200,
          headers: { "content-type": "application/json" }
        });
      }
      if (url.includes("/repositories?")) {
        const repositories = repositoriesForToken(token);
        return new Response(JSON.stringify({ repositories }), {
          status: 200,
          headers: { "content-type": "application/json" }
        });
      }
      return new Response(JSON.stringify({ message: "unexpected test URL" }), { status: 500 });
    });

    migrationPool = createDatabasePool(requireEnv("DATABASE_MIGRATION_URL"), {
      applicationName: "github-app-setup-integration-fixtures"
    });
    ownerA = await createTenant("tenant-a");
    ownerB = await createTenant("tenant-b");
    adminAUserId = await addMember(
      ownerA.organizationId,
      "tenant-a-admin",
      "organization_admin",
      ownerA.userId
    );
    instructorAUserId = await addMember(
      ownerA.organizationId,
      "tenant-a-instructor",
      "instructor",
      ownerA.userId
    );

    app = await createApiApplication();
    app.getHttpAdapter().getInstance().addHook("onRequest", async (request) => {
      const testUserId = request.headers["x-test-user-id"];
      if (typeof testUserId === "string" && testUserId.length > 0) {
        attachPlatformPrincipal(request as PlatformPrincipalCarrier, { userId: testUserId });
      }
    });
    await app.init();
  });

  afterAll(async () => {
    if (app !== undefined) await app.close();
    if (migrationPool !== undefined) {
      await migrationPool.query(
        `DELETE FROM integrations.github_webhook_inbox WHERE payload ->> 'testNamespace' = $1`,
        [testNamespace]
      );
      await migrationPool.query(
        `DELETE FROM organizations.organizations WHERE id = ANY($1::uuid[])`,
        [[ownerA.organizationId, ownerB.organizationId]]
      );
      await migrationPool.query(
        `DELETE FROM identity.users WHERE id = ANY($1::uuid[])`,
        [createdUserIds]
      );
      await migrationPool.end();
    }
    vi.unstubAllGlobals();
    for (const key of configKeys) {
      const value = previousEnv.get(key);
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });

  it("allows owners/admins to initiate setup but denies instructors", async () => {
    expect((await app.inject({
      method: "POST",
      url: `/v1/organizations/${ownerA.organizationId}/integrations/github/setup-sessions`,
      headers: { "x-test-user-id": ownerA.userId }
    })).statusCode).toBe(201);
    expect((await app.inject({
      method: "POST",
      url: `/v1/organizations/${ownerA.organizationId}/integrations/github/setup-sessions`,
      headers: { "x-test-user-id": adminAUserId }
    })).statusCode).toBe(201);
    expect((await app.inject({
      method: "POST",
      url: `/v1/organizations/${ownerA.organizationId}/integrations/github/setup-sessions`,
      headers: { "x-test-user-id": instructorAUserId }
    })).statusCode).toBe(403);
  });

  it("binds install state to one platform user and consumes it once", async () => {
    const state = await startSetup(ownerA.userId, ownerA.organizationId);
    const wrongUser = await app.inject({
      method: "GET",
      url: `/v1/integrations/github/setup/callback?state=${encodeURIComponent(state)}&installation_id=${installationA}&setup_action=install`,
      headers: { "x-test-user-id": adminAUserId }
    });
    expect(wrongUser.statusCode).toBe(400);
    await advanceToOAuth(ownerA.userId, state, installationA);
    const replay = await app.inject({
      method: "GET",
      url: `/v1/integrations/github/setup/callback?state=${encodeURIComponent(state)}&installation_id=${installationA}&setup_action=install`,
      headers: { "x-test-user-id": ownerA.userId }
    });
    expect(replay.statusCode).toBe(400);
  });

  it("rejects spoofed installation ids after GitHub user authorization and consumes OAuth state", async () => {
    const state = await startSetup(ownerA.userId, ownerA.organizationId);
    const oauthState = await advanceToOAuth(ownerA.userId, state, installationA);
    expect((await completeSetup(ownerA.userId, oauthState, "code-inaccessible")).statusCode)
      .toBe(403);
    expect((await completeSetup(ownerA.userId, oauthState, "code-owner-initial")).statusCode)
      .toBe(400);
  });

  it("idempotently resynchronizes mappings and prevents cross-organization claims", async () => {
    const state = await startSetup(ownerA.userId, ownerA.organizationId);
    const oauthState = await advanceToOAuth(ownerA.userId, state, installationA);
    const connectedResponse = await completeSetup(
      ownerA.userId,
      oauthState,
      "code-owner-initial"
    );
    expect(connectedResponse.statusCode).toBe(200);
    const connected = githubInstallationMappingSchema.parse(JSON.parse(connectedResponse.body));
    expect(connected.repositories.filter((repository) => repository.status === "active"))
      .toHaveLength(2);
    expect((await completeSetup(ownerA.userId, oauthState, "code-owner-initial")).statusCode)
      .toBe(400);

    const resyncState = await startSetup(ownerA.userId, ownerA.organizationId);
    const resyncOauth = await advanceToOAuth(ownerA.userId, resyncState, installationA);
    const resyncedResponse = await completeSetup(
      ownerA.userId,
      resyncOauth,
      "code-owner-resync"
    );
    expect(resyncedResponse.statusCode).toBe(200);
    const resynced = githubInstallationMappingSchema.parse(JSON.parse(resyncedResponse.body));
    expect(resynced.id).toBe(connected.id);
    expect(resynced.repositories.find(
      (repository) => repository.githubRepositoryId === String(repositoryA1)
    )?.status).toBe("removed");
    expect(resynced.repositories.find(
      (repository) => repository.githubRepositoryId === String(repositoryA2)
    )?.fullName).toContain("beta-renamed");
    expect(resynced.repositories.find(
      (repository) => repository.githubRepositoryId === String(repositoryA3)
    )?.status).toBe("active");

    const crossState = await startSetup(ownerB.userId, ownerB.organizationId);
    const crossOauth = await advanceToOAuth(ownerB.userId, crossState, installationA);
    expect((await completeSetup(ownerB.userId, crossOauth, "code-cross")).statusCode)
      .toBe(409);
    const otherTenant = await app.inject({
      method: "GET",
      url: `/v1/organizations/${ownerB.organizationId}/integrations/github`,
      headers: { "x-test-user-id": ownerB.userId }
    });
    expect(githubIntegrationViewSchema.parse(JSON.parse(otherTenant.body)).installations)
      .toHaveLength(0);
  });

  it("suspends mappings without deleting historical webhook inbox facts", async () => {
    const state = await startSetup(ownerA.userId, ownerA.organizationId);
    const oauthState = await advanceToOAuth(ownerA.userId, state, installationB);
    const connectedResponse = await completeSetup(ownerA.userId, oauthState, "code-suspend");
    const connected = githubInstallationMappingSchema.parse(JSON.parse(connectedResponse.body));

    const deliveryId = randomUUID();
    await migrationPool.query(
      `INSERT INTO integrations.github_webhook_inbox (
         organization_id, delivery_id, event_name, action,
         github_installation_id, github_repository_id, routing_status,
         payload_sha256, payload
       ) VALUES ($1, $2, 'pull_request', 'opened', $3, $4, 'mapped', $5, $6::jsonb)`,
      [
        ownerA.organizationId,
        deliveryId,
        installationB,
        repositoryB,
        createHash("sha256").update(testNamespace).digest("hex"),
        JSON.stringify({ testNamespace })
      ]
    );

    const suspendedResponse = await app.inject({
      method: "POST",
      url: `/v1/organizations/${ownerA.organizationId}/integrations/github/installations/${connected.id}/suspend`,
      headers: { "x-test-user-id": ownerA.userId }
    });
    expect(suspendedResponse.statusCode).toBe(200);
    const suspended = githubInstallationMappingSchema.parse(JSON.parse(suspendedResponse.body));
    expect(suspended.status).toBe("suspended");
    expect(suspended.repositories.every((repository) => repository.status === "removed"))
      .toBe(true);

    const inbox = await migrationPool.query<{ count: string }>(
      `SELECT count(*)::text AS count FROM integrations.github_webhook_inbox WHERE delivery_id = $1`,
      [deliveryId]
    );
    expect(inbox.rows[0]?.count).toBe("1");
  });
});
