import { randomUUID } from "node:crypto";

import type { NestFastifyApplication } from "@nestjs/platform-fastify";
import { projectSchema, projectTeamSchema } from "@platform/contracts";
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
    throw new Error(`${name} is required for Projects integration tests.`);
  }
  return value;
}

function externalId(): number {
  return 40_000_000_000 + Math.floor(Math.random() * 8_000_000_000);
}

type IdRow = { id: string };
type Actor = Readonly<{ userId: string; organizationId: string }>;
type RepositoryFixture = Readonly<{
  installationId: number;
  repositoryId: number;
  mappingId: string;
}>;

describe("Projects repository-backed vertical", () => {
  const namespace = randomUUID();
  const createdUserIds: string[] = [];
  let migrationPool: DatabasePool;
  let appPool: DatabasePool;
  let app: NestFastifyApplication;
  let ownerA: Actor;
  let ownerB: Actor;
  let adminA = "";
  let instructorA = "";
  let learnerA = "";
  let suspendedMemberA = "";
  let repositoryA: RepositoryFixture;
  let repositoryB: RepositoryFixture;
  let primaryTeamId = "";
  let primaryProjectId = "";
  let activeBindingId = "";

  async function createUser(label: string): Promise<string> {
    const result = await migrationPool.query<IdRow>(
      `INSERT INTO identity.users (email, display_name)
       VALUES ($1, $2)
       RETURNING id::text`,
      [`projects-${label}-${randomUUID()}@example.test`, `Projects ${label}`]
    );
    const id = result.rows[0]?.id;
    if (id === undefined) throw new Error("Failed to create Projects test user.");
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

  async function createTenant(label: string): Promise<Actor> {
    const userId = await createUser(`${label}-owner`);
    const organization = await migrationPool.query<IdRow>(
      `INSERT INTO organizations.organizations (slug, name, created_by_user_id)
       VALUES ($1, $2, $3)
       RETURNING id::text`,
      [`projects-${label}-${randomUUID()}`, `Projects ${label}`, userId]
    );
    const organizationId = organization.rows[0]?.id;
    if (organizationId === undefined) throw new Error("Failed to create Projects test organization.");
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
    status: "active" | "suspended",
    roleKey?: "organization_admin" | "instructor" | "learner"
  ): Promise<string> {
    const userId = await createUser(label);
    await migrationPool.query(
      `INSERT INTO organizations.memberships (
         organization_id, user_id, status, joined_at
       ) VALUES ($1, $2, $3, now())`,
      [organizationId, userId, status]
    );
    if (roleKey !== undefined) {
      await assignRole(organizationId, userId, roleKey, ownerA.userId);
    }
    return userId;
  }

  async function createRepository(
    organizationId: string,
    label: string
  ): Promise<RepositoryFixture> {
    const installationId = externalId();
    const repositoryId = externalId();
    await migrationPool.query(
      `INSERT INTO integrations.github_installations (
         organization_id, github_installation_id, status
       ) VALUES ($1, $2, 'active')`,
      [organizationId, installationId]
    );
    const repository = await migrationPool.query<IdRow>(
      `INSERT INTO integrations.github_repositories (
         organization_id,
         github_installation_id,
         github_repository_id,
         full_name,
         status
       ) VALUES ($1, $2, $3, $4, 'active')
       RETURNING id::text`,
      [organizationId, installationId, repositoryId, `example-${namespace}/${label}`]
    );
    const mappingId = repository.rows[0]?.id;
    if (mappingId === undefined) throw new Error("Failed to create trusted repository fixture.");
    return { installationId, repositoryId, mappingId };
  }

  function request(
    userId: string,
    method: "GET" | "POST" | "PUT" | "DELETE",
    url: string,
    payload?: Record<string, unknown>
  ) {
    return app.inject({
      method,
      url,
      headers: { "x-test-user-id": userId },
      ...(payload === undefined ? {} : { payload })
    });
  }

  beforeAll(async () => {
    migrationPool = createDatabasePool(requireEnv("DATABASE_MIGRATION_URL"), {
      applicationName: "projects-integration-fixtures"
    });
    appPool = createDatabasePool(requireEnv("DATABASE_URL"), {
      applicationName: "projects-integration-app-role"
    });
    ownerA = await createTenant("tenant-a");
    ownerB = await createTenant("tenant-b");
    adminA = await addMember(ownerA.organizationId, "admin-a", "active", "organization_admin");
    instructorA = await addMember(ownerA.organizationId, "instructor-a", "active", "instructor");
    learnerA = await addMember(ownerA.organizationId, "learner-a", "active", "learner");
    suspendedMemberA = await addMember(ownerA.organizationId, "suspended-a", "suspended");
    repositoryA = await createRepository(ownerA.organizationId, "alpha");
    repositoryB = await createRepository(ownerB.organizationId, "foreign");

    app = await createApiApplication();
    app.getHttpAdapter().getInstance().addHook("onRequest", async (incoming) => {
      const testUserId = incoming.headers["x-test-user-id"];
      if (typeof testUserId === "string" && testUserId.length > 0) {
        attachPlatformPrincipal(incoming as PlatformPrincipalCarrier, { userId: testUserId });
      }
    });
    await app.init();
  });

  afterAll(async () => {
    if (app !== undefined) await app.close();
    if (migrationPool !== undefined) {
      await migrationPool.query(
        `DELETE FROM organizations.organizations WHERE id = ANY($1::uuid[])`,
        [[ownerA.organizationId, ownerB.organizationId]]
      );
      await migrationPool.query(
        `DELETE FROM identity.users WHERE id = ANY($1::uuid[])`,
        [createdUserIds]
      );
    }
    await Promise.all([migrationPool?.end(), appPool?.end()]);
  });

  it("keeps Project Teams separate from Delivery Groups and restricts operators", async () => {
    const groupCountBefore = await migrationPool.query<{ count: string }>(
      `SELECT count(*)::text AS count
       FROM learning_delivery.group_memberships
       WHERE organization_id = $1`,
      [ownerA.organizationId]
    );

    const ownerResponse = await request(
      ownerA.userId,
      "POST",
      `/v1/organizations/${ownerA.organizationId}/project-teams`,
      { name: "Primary team", members: [learnerA] }
    );
    expect(ownerResponse.statusCode).toBe(201);
    const primaryTeam = projectTeamSchema.parse(JSON.parse(ownerResponse.body));
    primaryTeamId = primaryTeam.id;
    expect(primaryTeam.members.map((member) => member.userId)).toEqual([learnerA]);

    for (const [actor, name] of [
      [adminA, "Admin team"],
      [instructorA, "Instructor team"]
    ] as const) {
      const response = await request(
        actor,
        "POST",
        `/v1/organizations/${ownerA.organizationId}/project-teams`,
        { name, members: [learnerA] }
      );
      expect(response.statusCode).toBe(201);
    }

    const learnerDenied = await request(
      learnerA,
      "POST",
      `/v1/organizations/${ownerA.organizationId}/project-teams`,
      { name: "Learner team", members: [learnerA] }
    );
    expect(learnerDenied.statusCode).toBe(403);

    const suspendedDenied = await request(
      ownerA.userId,
      "POST",
      `/v1/organizations/${ownerA.organizationId}/project-teams`,
      { name: "Invalid team", members: [suspendedMemberA] }
    );
    expect(suspendedDenied.statusCode).toBe(409);

    const groupCountAfter = await migrationPool.query<{ count: string }>(
      `SELECT count(*)::text AS count
       FROM learning_delivery.group_memberships
       WHERE organization_id = $1`,
      [ownerA.organizationId]
    );
    expect(groupCountAfter.rows[0]?.count).toBe(groupCountBefore.rows[0]?.count);

    const teamMembership = await migrationPool.query<{ count: string }>(
      `SELECT count(*)::text AS count
       FROM projects.team_memberships
       WHERE organization_id = $1 AND team_id = $2 AND user_id = $3 AND removed_at IS NULL`,
      [ownerA.organizationId, primaryTeamId, learnerA]
    );
    expect(teamMembership.rows[0]?.count).toBe("1");
  });

  it("binds one trusted repository idempotently and rejects cross-tenant or duplicate ownership", async () => {
    const created = await request(
      instructorA,
      "POST",
      `/v1/organizations/${ownerA.organizationId}/projects`,
      { name: "Repository project", teamId: primaryTeamId }
    );
    expect(created.statusCode).toBe(201);
    primaryProjectId = projectSchema.parse(JSON.parse(created.body)).id;

    const connectUrl = `/v1/organizations/${ownerA.organizationId}/projects/${primaryProjectId}/repository`;
    const connectedResponse = await request(ownerA.userId, "PUT", connectUrl, {
      repositoryMappingId: repositoryA.mappingId
    });
    expect(connectedResponse.statusCode).toBe(200);
    const connected = projectSchema.parse(JSON.parse(connectedResponse.body));
    expect(connected.repository?.repositoryMappingId).toBe(repositoryA.mappingId);
    expect(connected.repository?.availability).toBe("active");
    activeBindingId = connected.repository?.bindingId ?? "";

    const repeated = projectSchema.parse(JSON.parse((await request(
      ownerA.userId,
      "PUT",
      connectUrl,
      { repositoryMappingId: repositoryA.mappingId }
    )).body));
    expect(repeated.repository?.bindingId).toBe(activeBindingId);

    const bindingCount = await migrationPool.query<{ count: string }>(
      `SELECT count(*)::text AS count
       FROM projects.repository_bindings
       WHERE organization_id = $1 AND project_id = $2`,
      [ownerA.organizationId, primaryProjectId]
    );
    expect(bindingCount.rows[0]?.count).toBe("1");

    const secondProjectResponse = await request(
      ownerA.userId,
      "POST",
      `/v1/organizations/${ownerA.organizationId}/projects`,
      { name: "Second project", teamId: primaryTeamId }
    );
    const secondProject = projectSchema.parse(JSON.parse(secondProjectResponse.body));
    expect((await request(
      ownerA.userId,
      "PUT",
      `/v1/organizations/${ownerA.organizationId}/projects/${secondProject.id}/repository`,
      { repositoryMappingId: repositoryA.mappingId }
    )).statusCode).toBe(409);

    expect((await request(
      ownerA.userId,
      "PUT",
      `/v1/organizations/${ownerA.organizationId}/projects/${secondProject.id}/repository`,
      { repositoryMappingId: repositoryB.mappingId }
    )).statusCode).toBe(404);

    await expect(withTenantTransaction(
      appPool,
      { organizationId: ownerA.organizationId, userId: ownerA.userId },
      async (transaction) => {
        await transaction.client.query(
          `INSERT INTO projects.repository_bindings (
             organization_id,
             project_id,
             github_repository_mapping_id,
             connected_by_user_id
           ) VALUES ($1, $2, $3, $4)`,
          [ownerA.organizationId, secondProject.id, repositoryB.mappingId, ownerA.userId]
        );
      }
    )).rejects.toMatchObject({ code: "23503" });
  });

  it("preserves the Project binding while current repository availability changes", async () => {
    await migrationPool.query(
      `UPDATE integrations.github_installations
       SET status = 'suspended', updated_at = now()
       WHERE organization_id = $1 AND github_installation_id = $2`,
      [ownerA.organizationId, repositoryA.installationId]
    );
    await migrationPool.query(
      `UPDATE integrations.github_repositories
       SET status = 'suspended', updated_at = now()
       WHERE organization_id = $1 AND id = $2`,
      [ownerA.organizationId, repositoryA.mappingId]
    );

    const suspended = projectSchema.parse(JSON.parse((await request(
      ownerA.userId,
      "GET",
      `/v1/organizations/${ownerA.organizationId}/projects/${primaryProjectId}`
    )).body));
    expect(suspended.repository?.bindingId).toBe(activeBindingId);
    expect(suspended.repository?.availability).toBe("suspended");

    await migrationPool.query(
      `UPDATE integrations.github_installations
       SET status = 'active', updated_at = now()
       WHERE organization_id = $1 AND github_installation_id = $2`,
      [ownerA.organizationId, repositoryA.installationId]
    );
    await migrationPool.query(
      `UPDATE integrations.github_repositories
       SET status = 'removed', updated_at = now()
       WHERE organization_id = $1 AND id = $2`,
      [ownerA.organizationId, repositoryA.mappingId]
    );

    const removed = projectSchema.parse(JSON.parse((await request(
      ownerA.userId,
      "GET",
      `/v1/organizations/${ownerA.organizationId}/projects/${primaryProjectId}`
    )).body));
    expect(removed.repository?.bindingId).toBe(activeBindingId);
    expect(removed.repository?.availability).toBe("removed");

    const binding = await migrationPool.query<{ disconnected_at: Date | null }>(
      `SELECT disconnected_at
       FROM projects.repository_bindings
       WHERE id = $1`,
      [activeBindingId]
    );
    expect(binding.rows[0]?.disconnected_at).toBeNull();
  });

  it("disconnects non-destructively and idempotently while preserving binding history", async () => {
    const url = `/v1/organizations/${ownerA.organizationId}/projects/${primaryProjectId}/repository`;
    const first = projectSchema.parse(JSON.parse((await request(
      ownerA.userId,
      "DELETE",
      url
    )).body));
    expect(first.repository).toBeNull();

    const second = projectSchema.parse(JSON.parse((await request(
      ownerA.userId,
      "DELETE",
      url
    )).body));
    expect(second.repository).toBeNull();

    const history = await migrationPool.query<{
      count: string;
      disconnected: string;
    }>(
      `SELECT
         count(*)::text AS count,
         count(*) FILTER (WHERE disconnected_at IS NOT NULL)::text AS disconnected
       FROM projects.repository_bindings
       WHERE organization_id = $1 AND project_id = $2`,
      [ownerA.organizationId, primaryProjectId]
    );
    expect(history.rows[0]).toEqual({ count: "1", disconnected: "1" });

    const projectStillExists = await migrationPool.query<{ count: string }>(
      `SELECT count(*)::text AS count
       FROM projects.projects
       WHERE organization_id = $1 AND id = $2`,
      [ownerA.organizationId, primaryProjectId]
    );
    expect(projectStillExists.rows[0]?.count).toBe("1");
  });
});
