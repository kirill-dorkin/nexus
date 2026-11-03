import { createHash, randomUUID } from "node:crypto";

import type { NestFastifyApplication } from "@nestjs/platform-fastify";
import { projectActivityPageSchema } from "@platform/contracts";
import {
  createDatabasePool,
  withTenantTransaction,
  type DatabasePool
} from "@platform/database";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createApiApplication } from "./app.factory";
import {
  attachPlatformPrincipal,
  type PlatformPrincipalCarrier
} from "./request-context/platform-principal";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (value === undefined || value.trim().length === 0) {
    throw new Error(
      `${name} is required for Project activity integration tests.`
    );
  }
  return value;
}

function externalId(): number {
  return 50_000_000_000 + Math.floor(Math.random() * 8_000_000_000);
}

function sha(seed: string): string {
  return createHash("sha1").update(seed).digest("hex");
}

type IdRow = { id: string };
type Actor = Readonly<{ userId: string; organizationId: string }>;
type Fixture = Readonly<{
  organizationId: string;
  ownerUserId: string;
  projectId: string;
  bindingId: string;
  repositoryMappingId: string;
  installationId: number;
  repositoryId: number;
}>;

describe("Project activity read model", () => {
  const userIds: string[] = [];
  const organizationIds: string[] = [];
  const deliveryIds: string[] = [];
  let migrationPool: DatabasePool;
  let appPool: DatabasePool;
  let app: NestFastifyApplication;
  let tenantA: Actor;
  let tenantB: Actor;
  let learnerA = "";
  let fixtureA: Fixture;
  let fixtureB: Fixture;

  async function createUser(label: string): Promise<string> {
    const result = await migrationPool.query<IdRow>(
      `INSERT INTO identity.users (email, display_name)
       VALUES ($1, $2)
       RETURNING id::text`,
      [
        `project-activity-${label}-${randomUUID()}@example.test`,
        `Project activity ${label}`
      ]
    );
    const id = result.rows[0]?.id;
    if (id === undefined)
      throw new Error("Failed to create Project activity test user.");
    userIds.push(id);
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

  async function createTenant(label: string): Promise<Actor> {
    const userId = await createUser(`${label}-owner`);
    const organization = await migrationPool.query<IdRow>(
      `INSERT INTO organizations.organizations (slug, name, created_by_user_id)
       VALUES ($1, $2, $3)
       RETURNING id::text`,
      [
        `project-activity-${label}-${randomUUID()}`,
        `Project activity ${label}`,
        userId
      ]
    );
    const organizationId = organization.rows[0]?.id;
    if (organizationId === undefined)
      throw new Error("Failed to create Project activity organization.");
    organizationIds.push(organizationId);
    await migrationPool.query(
      `INSERT INTO organizations.memberships (organization_id, user_id, status, joined_at)
       VALUES ($1, $2, 'active', now())`,
      [organizationId, userId]
    );
    await assignRole(organizationId, userId, "organization_owner", userId);
    return { userId, organizationId };
  }

  async function createProjectFixture(
    actor: Actor,
    label: string
  ): Promise<Fixture> {
    const installationId = externalId();
    const repositoryId = externalId();
    await migrationPool.query(
      `INSERT INTO integrations.github_installations (
         organization_id, github_installation_id, status
       ) VALUES ($1, $2, 'active')`,
      [actor.organizationId, installationId]
    );
    const repository = await migrationPool.query<IdRow>(
      `INSERT INTO integrations.github_repositories (
         organization_id, github_installation_id, github_repository_id, full_name, status
       ) VALUES ($1, $2, $3, $4, 'active')
       RETURNING id::text`,
      [
        actor.organizationId,
        installationId,
        repositoryId,
        `project-activity-${label}/repository`
      ]
    );
    const repositoryMappingId = repository.rows[0]?.id;
    if (repositoryMappingId === undefined)
      throw new Error("Failed to create repository mapping.");

    const team = await migrationPool.query<IdRow>(
      `INSERT INTO projects.teams (organization_id, name, created_by_user_id)
       VALUES ($1, $2, $3)
       RETURNING id::text`,
      [actor.organizationId, `Activity team ${label}`, actor.userId]
    );
    const teamId = team.rows[0]?.id;
    if (teamId === undefined)
      throw new Error("Failed to create Project activity team.");

    const project = await migrationPool.query<IdRow>(
      `INSERT INTO projects.projects (organization_id, team_id, name, created_by_user_id)
       VALUES ($1, $2, $3, $4)
       RETURNING id::text`,
      [actor.organizationId, teamId, `Activity project ${label}`, actor.userId]
    );
    const projectId = project.rows[0]?.id;
    if (projectId === undefined)
      throw new Error("Failed to create Project activity project.");

    const binding = await migrationPool.query<IdRow>(
      `INSERT INTO projects.repository_bindings (
         organization_id,
         project_id,
         github_repository_mapping_id,
         connected_by_user_id,
         connected_at
       ) VALUES ($1, $2, $3, $4, now() - interval '1 hour')
       RETURNING id::text`,
      [actor.organizationId, projectId, repositoryMappingId, actor.userId]
    );
    const bindingId = binding.rows[0]?.id;
    if (bindingId === undefined)
      throw new Error("Failed to create Project activity binding.");

    return {
      organizationId: actor.organizationId,
      ownerUserId: actor.userId,
      projectId,
      bindingId,
      repositoryMappingId,
      installationId,
      repositoryId
    };
  }

  async function insertPullRequestFact(
    fixture: Fixture,
    input: Readonly<{
      action: string;
      number: number;
      state: "open" | "closed";
      sourceReceivedAt: string;
      providerUpdatedAt: string;
      merged?: boolean;
    }>
  ): Promise<string> {
    const deliveryId = randomUUID();
    deliveryIds.push(deliveryId);
    const objectId = externalId();
    const payload = JSON.stringify({
      installation: { id: fixture.installationId },
      repository: { id: fixture.repositoryId },
      pull_request: { id: objectId, number: input.number }
    });
    const payloadHash = createHash("sha256").update(payload).digest("hex");
    const inbox = await migrationPool.query<IdRow>(
      `INSERT INTO integrations.github_webhook_inbox (
         organization_id,
         delivery_id,
         event_name,
         action,
         github_installation_id,
         github_repository_id,
         routing_status,
         payload_sha256,
         payload,
         received_at
       ) VALUES ($1, $2, 'pull_request', $3, $4, $5, 'mapped', $6, $7::jsonb, $8)
       RETURNING id::text`,
      [
        fixture.organizationId,
        deliveryId,
        input.action,
        fixture.installationId,
        fixture.repositoryId,
        payloadHash,
        payload,
        input.sourceReceivedAt
      ]
    );
    const sourceInboxId = inbox.rows[0]?.id;
    if (sourceInboxId === undefined)
      throw new Error("Failed to create Project activity inbox row.");

    const fact = await migrationPool.query<IdRow>(
      `INSERT INTO projects.github_project_facts (
         organization_id,
         project_id,
         repository_binding_id,
         github_repository_mapping_id,
         source_inbox_id,
         source_delivery_id,
         source_payload_sha256,
         fact_type,
         action,
         github_repository_id,
         github_object_id,
         github_pull_request_id,
         github_pull_request_number,
         github_subject_user_id,
         github_subject_user_login,
         github_sender_user_id,
         github_sender_user_login,
         state,
         head_sha,
         is_draft,
         is_merged,
         provider_created_at,
         provider_updated_at,
         source_received_at
       ) VALUES (
         $1, $2, $3, $4, $5, $6, $7, 'pull_request', $8, $9, $10, $10, $11,
         $12, $13, $14, $15, $16, $17, false, $18, $19, $20, $21
       )
       RETURNING id::text`,
      [
        fixture.organizationId,
        fixture.projectId,
        fixture.bindingId,
        fixture.repositoryMappingId,
        sourceInboxId,
        deliveryId,
        payloadHash,
        input.action,
        fixture.repositoryId,
        objectId,
        input.number,
        externalId(),
        "external-author",
        externalId(),
        "external-sender",
        input.state,
        sha(`head-${deliveryId}`),
        input.merged ?? false,
        "2026-09-16T01:00:00.000Z",
        input.providerUpdatedAt,
        input.sourceReceivedAt
      ]
    );
    const id = fact.rows[0]?.id;
    if (id === undefined)
      throw new Error("Failed to create Project activity fact.");
    return id;
  }

  function request(userId: string, url: string) {
    return app.inject({
      method: "GET",
      url,
      headers: { "x-test-user-id": userId }
    });
  }

  beforeAll(async () => {
    migrationPool = createDatabasePool(requireEnv("DATABASE_MIGRATION_URL"), {
      applicationName: "project-activity-fixtures"
    });
    appPool = createDatabasePool(requireEnv("DATABASE_URL"), {
      applicationName: "project-activity-app-role"
    });

    tenantA = await createTenant("tenant-a");
    tenantB = await createTenant("tenant-b");
    learnerA = await createUser("learner-a");
    await migrationPool.query(
      `INSERT INTO organizations.memberships (organization_id, user_id, status, joined_at)
       VALUES ($1, $2, 'active', now())`,
      [tenantA.organizationId, learnerA]
    );
    await assignRole(
      tenantA.organizationId,
      learnerA,
      "learner",
      tenantA.userId
    );

    fixtureA = await createProjectFixture(tenantA, "tenant-a");
    fixtureB = await createProjectFixture(tenantB, "tenant-b");

    await insertPullRequestFact(fixtureA, {
      action: "opened",
      number: 10,
      state: "open",
      sourceReceivedAt: "2026-09-16T10:00:00.000Z",
      providerUpdatedAt: "2026-09-16T14:00:00.000Z"
    });
    await insertPullRequestFact(fixtureA, {
      action: "edited",
      number: 11,
      state: "open",
      sourceReceivedAt: "2026-09-16T11:00:00.000Z",
      providerUpdatedAt: "2026-09-16T09:00:00.000Z"
    });
    await insertPullRequestFact(fixtureA, {
      action: "closed",
      number: 12,
      state: "closed",
      sourceReceivedAt: "2026-09-16T11:00:00.000Z",
      providerUpdatedAt: "2026-09-16T13:00:00.000Z",
      merged: true
    });
    await insertPullRequestFact(fixtureA, {
      action: "reopened",
      number: 13,
      state: "open",
      sourceReceivedAt: "2026-09-16T12:00:00.000Z",
      providerUpdatedAt: "2026-09-16T08:00:00.000Z"
    });
    await insertPullRequestFact(fixtureB, {
      action: "opened",
      number: 99,
      state: "open",
      sourceReceivedAt: "2026-09-16T12:30:00.000Z",
      providerUpdatedAt: "2026-09-16T12:30:00.000Z"
    });

    app = await createApiApplication();
    app
      .getHttpAdapter()
      .getInstance()
      .addHook("onRequest", async (incoming) => {
        const testUserId = incoming.headers["x-test-user-id"];
        if (typeof testUserId === "string" && testUserId.length > 0) {
          attachPlatformPrincipal(incoming as PlatformPrincipalCarrier, {
            userId: testUserId
          });
        }
      });
    await app.init();
  });

  afterAll(async () => {
    if (app !== undefined) await app.close();
    if (migrationPool !== undefined) {
      if (organizationIds.length > 0) {
        await migrationPool.query(
          `DELETE FROM projects.github_project_facts
           WHERE organization_id = ANY($1::uuid[])`,
          [organizationIds]
        );
      }
      if (deliveryIds.length > 0) {
        await migrationPool.query(
          `DELETE FROM integrations.github_webhook_inbox
           WHERE delivery_id = ANY($1::uuid[])`,
          [deliveryIds]
        );
      }
      if (organizationIds.length > 0) {
        await migrationPool.query(
          `DELETE FROM organizations.organizations WHERE id = ANY($1::uuid[])`,
          [organizationIds]
        );
      }
      if (userIds.length > 0) {
        await migrationPool.query(
          `DELETE FROM identity.users WHERE id = ANY($1::uuid[])`,
          [userIds]
        );
      }
    }
    await Promise.all([migrationPool?.end(), appPool?.end()]);
  });

  it("paginates immutable Project activity with a stable receive-time/id cursor", async () => {
    const baseUrl = `/v1/organizations/${tenantA.organizationId}/projects/${fixtureA.projectId}/activity`;
    const firstResponse = await request(tenantA.userId, `${baseUrl}?limit=2`);
    expect(firstResponse.statusCode).toBe(200);
    const first = projectActivityPageSchema.parse(
      JSON.parse(firstResponse.body)
    );
    expect(first.project.id).toBe(fixtureA.projectId);
    expect(first.project.repository?.availability).toBe("active");
    expect(first.items).toHaveLength(2);
    expect(first.nextCursor).not.toBeNull();
    expect(first.items[0]?.providerUpdatedAt).toBe("2026-09-16T08:00:00.000Z");

    const secondResponse = await request(
      tenantA.userId,
      `${baseUrl}?limit=2&cursor=${encodeURIComponent(first.nextCursor!)}`
    );
    expect(secondResponse.statusCode).toBe(200);
    const second = projectActivityPageSchema.parse(
      JSON.parse(secondResponse.body)
    );
    expect(second.items).toHaveLength(2);
    expect(second.nextCursor).toBeNull();

    const expected = await migrationPool.query<{ id: string }>(
      `SELECT id::text
       FROM projects.github_project_facts
       WHERE organization_id = $1 AND project_id = $2
       ORDER BY source_received_at DESC, id DESC`,
      [tenantA.organizationId, fixtureA.projectId]
    );
    const combinedIds = [...first.items, ...second.items].map(
      (item) => item.id
    );
    expect(combinedIds).toEqual(expected.rows.map((row) => row.id));
    expect(new Set(combinedIds).size).toBe(4);

    const invalidCursor = await request(
      tenantA.userId,
      `${baseUrl}?cursor=not-a-cursor`
    );
    expect(invalidCursor.statusCode).toBe(400);
  });

  it("enforces Project operator authorization and database tenant isolation", async () => {
    const url = `/v1/organizations/${tenantA.organizationId}/projects/${fixtureA.projectId}/activity`;
    expect((await request(learnerA, url)).statusCode).toBe(403);
    expect((await request(tenantB.userId, url)).statusCode).toBe(403);

    await withTenantTransaction(
      appPool,
      { organizationId: tenantA.organizationId, userId: tenantA.userId },
      async (transaction) => {
        const foreign = await transaction.client.query<{ count: string }>(
          `SELECT count(*)::text AS count
           FROM projects.github_project_facts
           WHERE organization_id = $1 AND project_id = $2`,
          [tenantB.organizationId, fixtureB.projectId]
        );
        expect(foreign.rows[0]?.count).toBe("0");
      }
    );
  });

  it("keeps historical activity readable while current repository availability changes", async () => {
    await migrationPool.query(
      `UPDATE integrations.github_repositories
       SET status = 'suspended', updated_at = now()
       WHERE organization_id = $1 AND id = $2`,
      [tenantA.organizationId, fixtureA.repositoryMappingId]
    );

    const url = `/v1/organizations/${tenantA.organizationId}/projects/${fixtureA.projectId}/activity?limit=10`;
    const suspended = projectActivityPageSchema.parse(
      JSON.parse((await request(tenantA.userId, url)).body)
    );
    expect(suspended.project.repository?.availability).toBe("suspended");
    expect(suspended.items).toHaveLength(4);

    await migrationPool.query(
      `UPDATE integrations.github_repositories
       SET status = 'removed', updated_at = now()
       WHERE organization_id = $1 AND id = $2`,
      [tenantA.organizationId, fixtureA.repositoryMappingId]
    );
    const removed = projectActivityPageSchema.parse(
      JSON.parse((await request(tenantA.userId, url)).body)
    );
    expect(removed.project.repository?.availability).toBe("removed");
    expect(removed.items).toHaveLength(4);
  });

  it("keeps historical activity after repository disconnect while current Project repository becomes null", async () => {
    await migrationPool.query(
      `UPDATE projects.repository_bindings
       SET disconnected_by_user_id = $2,
           disconnected_at = now()
       WHERE id = $1`,
      [fixtureA.bindingId, tenantA.userId]
    );

    const response = await request(
      tenantA.userId,
      `/v1/organizations/${tenantA.organizationId}/projects/${fixtureA.projectId}/activity?limit=10`
    );
    expect(response.statusCode).toBe(200);
    const page = projectActivityPageSchema.parse(JSON.parse(response.body));
    expect(page.project.repository).toBeNull();
    expect(page.items).toHaveLength(4);
    expect(
      page.items.every(
        (item) => item.repositoryBindingId === fixtureA.bindingId
      )
    ).toBe(true);
  });
});
