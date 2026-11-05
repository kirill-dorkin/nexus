import { randomUUID } from "node:crypto";

import type { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createDatabasePool } from "./pool";
import { withTenantTransaction } from "./transaction";

function requireEnvironment(name: string): string {
  const value = process.env[name];

  if (value === undefined || value.trim().length === 0) {
    throw new Error(`${name} is required for database integration tests.`);
  }

  return value;
}

type Fixture = {
  userA: string;
  userB: string;
  organizationA: string;
  organizationB: string;
  organizationAName: string;
};

let appPool: Pool;
let migrationPool: Pool;
let workerPool: Pool;
let fixture: Fixture | undefined;

function requireFixture(): Fixture {
  if (fixture === undefined) {
    throw new Error("Database integration-test fixture is not initialized.");
  }

  return fixture;
}

async function nextUuid(pool: Pool): Promise<string> {
  const result = await pool.query<{ id: string }>(
    "SELECT uuidv7()::text AS id"
  );
  const row = result.rows[0];

  if (row === undefined) {
    throw new Error("PostgreSQL did not generate a UUIDv7 fixture id.");
  }

  return row.id;
}

async function createOrganizationFixture(
  organizationId: string,
  userId: string,
  slug: string,
  name: string
): Promise<void> {
  await withTenantTransaction(
    appPool,
    { organizationId, userId },
    async ({ client }) => {
      await client.query(
        `INSERT INTO organizations.organizations
          (id, slug, name, created_by_user_id)
         VALUES ($1, $2, $3, $4)`,
        [organizationId, slug, name, userId]
      );

      await client.query(
        `INSERT INTO organizations.memberships
          (organization_id, user_id, status, joined_at)
         VALUES ($1, $2, 'active', now())`,
        [organizationId, userId]
      );

      await client.query(
        `INSERT INTO access_control.role_assignments
          (organization_id, user_id, role_id, scope_type, scope_id, assigned_by_user_id)
         SELECT $1, $2, id, 'organization', $1, $2
         FROM access_control.roles
         WHERE key = 'organization_owner'`,
        [organizationId, userId]
      );

      await client.query(
        `INSERT INTO events.outbox
          (organization_id, event_name, event_version, aggregate_type, aggregate_id, actor_user_id, payload)
         VALUES ($1, 'organization.created', 1, 'organization', $1, $2, $3::jsonb)`,
        [organizationId, userId, JSON.stringify({ organizationId })]
      );
    }
  );
}

beforeAll(async () => {
  migrationPool = createDatabasePool(
    requireEnvironment("DATABASE_MIGRATION_URL"),
    {
      applicationName: "database-integration-migrator",
      maxConnections: 1
    }
  );
  appPool = createDatabasePool(requireEnvironment("DATABASE_URL"), {
    applicationName: "database-integration-app",
    maxConnections: 1
  });
  workerPool = createDatabasePool(requireEnvironment("DATABASE_WORKER_URL"), {
    applicationName: "database-integration-worker",
    maxConnections: 1
  });

  const suffix = randomUUID().replaceAll("-", "").slice(0, 16);

  const userAResult = await appPool.query<{ id: string }>(
    `INSERT INTO identity.users (email, display_name)
     VALUES ($1, 'Integration User A')
     RETURNING id::text AS id`,
    [`integration-a-${suffix}@example.invalid`]
  );
  const userBResult = await appPool.query<{ id: string }>(
    `INSERT INTO identity.users (email, display_name)
     VALUES ($1, 'Integration User B')
     RETURNING id::text AS id`,
    [`integration-b-${suffix}@example.invalid`]
  );

  const userA = userAResult.rows[0]?.id;
  const userB = userBResult.rows[0]?.id;

  if (userA === undefined || userB === undefined) {
    throw new Error("Failed to create integration-test users.");
  }

  const organizationA = await nextUuid(appPool);
  const organizationB = await nextUuid(appPool);
  const organizationAName = `Integration Organization A ${suffix}`;

  await createOrganizationFixture(
    organizationA,
    userA,
    `integration-a-${suffix}`,
    organizationAName
  );
  await createOrganizationFixture(
    organizationB,
    userB,
    `integration-b-${suffix}`,
    `Integration Organization B ${suffix}`
  );

  fixture = {
    userA,
    userB,
    organizationA,
    organizationB,
    organizationAName
  };
});

afterAll(async () => {
  if (fixture !== undefined) {
    const organizationIds = [fixture.organizationA, fixture.organizationB];
    const userIds = [fixture.userA, fixture.userB];

    await migrationPool.query(
      "DELETE FROM events.outbox WHERE aggregate_id = ANY($1::uuid[])",
      [organizationIds]
    );
    await migrationPool.query(
      "DELETE FROM organizations.organizations WHERE id = ANY($1::uuid[])",
      [organizationIds]
    );
    await migrationPool.query(
      "DELETE FROM identity.users WHERE id = ANY($1::uuid[])",
      [userIds]
    );
  }

  await Promise.all([appPool?.end(), migrationPool?.end(), workerPool?.end()]);
});

describe("database security foundation", () => {
  it("keeps every runtime/migration role non-superuser and unable to bypass RLS", async () => {
    const result = await migrationPool.query<{
      rolname: string;
      rolsuper: boolean;
      rolcreatedb: boolean;
      rolcreaterole: boolean;
      rolbypassrls: boolean;
    }>(`
      SELECT rolname, rolsuper, rolcreatedb, rolcreaterole, rolbypassrls
      FROM pg_roles
      WHERE rolname IN ('platform_migrator', 'platform_app', 'platform_worker')
      ORDER BY rolname
    `);

    expect(result.rows).toHaveLength(3);
    for (const role of result.rows) {
      expect(role).toMatchObject({
        rolsuper: false,
        rolcreatedb: false,
        rolcreaterole: false,
        rolbypassrls: false
      });
    }
  });

  it("protects the skill test tables (ADR-0075, migration 000050)", async () => {
    const tables = await migrationPool.query<{
      name: string;
      rls: boolean;
      policies: number;
    }>(`
      SELECT n.nspname || '.' || c.relname AS name,
             c.relrowsecurity AS rls,
             (SELECT count(*)::int FROM pg_policies p
               WHERE p.schemaname = n.nspname AND p.tablename = c.relname) AS policies
        FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
       WHERE (n.nspname, c.relname) IN (('learning_content', 'skill_test_banks'),
                                        ('learning_progress', 'skill_test_draws'))
       ORDER BY 1
    `);
    expect(tables.rows).toEqual([
      { name: "learning_content.skill_test_banks", rls: true, policies: 1 },
      { name: "learning_progress.skill_test_draws", rls: true, policies: 1 }
    ]);

    // The runtime role may not rewrite a draw or delete either table's rows.
    const privileges = await migrationPool.query<{ privilege: string }>(`
      SELECT privilege_type AS privilege
        FROM information_schema.role_table_grants
       WHERE grantee = 'platform_app'
         AND table_schema = 'learning_progress' AND table_name = 'skill_test_draws'
       ORDER BY 1
    `);
    expect(privileges.rows.map((row) => row.privilege)).toEqual([
      "INSERT",
      "SELECT"
    ]);
    const columns = await migrationPool.query<{ column: string }>(`
      SELECT column_name AS column
        FROM information_schema.column_privileges
       WHERE grantee = 'platform_app' AND privilege_type = 'UPDATE'
         AND table_schema = 'learning_progress' AND table_name = 'skill_test_draws'
    `);
    expect(columns.rows).toEqual([{ column: "attempt_id" }]);

    const triggers = await migrationPool.query<{ name: string }>(`
      SELECT tgname AS name FROM pg_trigger
       WHERE NOT tgisinternal
         AND tgrelid IN ('learning_content.skill_test_banks'::regclass,
                         'learning_progress.skill_test_draws'::regclass)
       ORDER BY 1
    `);
    expect(triggers.rows.map((row) => row.name)).toEqual([
      "skill_test_banks_require_draft",
      "skill_test_banks_revision",
      "skill_test_draws_protect"
    ]);
  });

  it("protects the skill map tables (ADR-0078, migration 000051)", async () => {
    const tables = await migrationPool.query<{
      name: string;
      rls: boolean;
      policies: number;
    }>(`
      SELECT c.relname AS name, c.relrowsecurity AS rls,
             (SELECT count(*)::int FROM pg_policies p
               WHERE p.schemaname = 'learning_content' AND p.tablename = c.relname) AS policies
        FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
       WHERE n.nspname = 'learning_content'
         AND c.relname IN ('skill_maps', 'skill_map_versions', 'skill_map_prerequisites')
       ORDER BY 1
    `);
    expect(tables.rows).toEqual([
      { name: "skill_map_prerequisites", rls: true, policies: 1 },
      { name: "skill_map_versions", rls: true, policies: 1 },
      { name: "skill_maps", rls: true, policies: 1 }
    ]);

    // A published version is protected by a trigger; the runtime role updates only the
    // publication columns of a draft and may not touch the map's identity.
    const columns = await migrationPool.query<{ column: string }>(`
      SELECT column_name AS column
        FROM information_schema.column_privileges
       WHERE grantee = 'platform_app' AND privilege_type = 'UPDATE'
         AND table_schema = 'learning_content' AND table_name = 'skill_map_versions'
       ORDER BY 1
    `);
    expect(columns.rows.map((row) => row.column)).toEqual([
      "document",
      "published_at",
      "published_by_user_id",
      "status"
    ]);
    const triggers = await migrationPool.query<{ name: string }>(`
      SELECT tgname AS name FROM pg_trigger
       WHERE NOT tgisinternal
         AND tgrelid IN ('learning_content.skill_map_versions'::regclass,
                         'learning_content.skill_map_prerequisites'::regclass)
       ORDER BY 1
    `);
    expect(triggers.rows.map((row) => row.name)).toEqual([
      "skill_map_prerequisites_require_draft",
      "skill_map_versions_protect"
    ]);

    // An unknown organization's public map reads as null for the runtime role.
    const map = await appPool.query<{ document: unknown }>(
      "SELECT learning_content.read_public_skill_map('no-such-org', 'main') AS document"
    );
    expect(map.rows[0]?.document ?? null).toBeNull();
  });

  it("keeps registration consents append-only (ADR-0083, migration 000052)", async () => {
    const privileges = await migrationPool.query<{ privilege: string }>(`
      SELECT privilege_type AS privilege
        FROM information_schema.table_privileges
       WHERE grantee = 'platform_app'
         AND table_schema = 'identity' AND table_name = 'legal_consents'
       ORDER BY 1
    `);
    expect(privileges.rows.map((row) => row.privilege)).toEqual([
      "INSERT",
      "SELECT"
    ]);
  });

  it("does not expose tenant rows without transaction-local organization context", async () => {
    requireFixture();

    const result = await appPool.query<{ id: string }>(`
      SELECT id::text AS id
      FROM organizations.organizations
      ORDER BY id
    `);

    expect(result.rows).toEqual([]);

    const context = await appPool.query<{ organization_id: string | null }>(`
      SELECT nullif(current_setting('app.organization_id', true), '') AS organization_id
    `);
    expect(context.rows[0]?.organization_id ?? null).toBeNull();
  });

  it("isolates organization data through RLS", async () => {
    const currentFixture = requireFixture();

    const visibleFromA = await withTenantTransaction(
      appPool,
      {
        organizationId: currentFixture.organizationA,
        userId: currentFixture.userA
      },
      async ({ client }) =>
        client.query<{ id: string }>(`
          SELECT id::text AS id
          FROM organizations.organizations
          ORDER BY id
        `)
    );

    expect(visibleFromA.rows.map((row) => row.id)).toEqual([
      currentFixture.organizationA
    ]);

    await expect(
      withTenantTransaction(
        appPool,
        {
          organizationId: currentFixture.organizationA,
          userId: currentFixture.userA
        },
        async ({ client }) =>
          client.query(
            `INSERT INTO organizations.memberships
              (organization_id, user_id, status, joined_at)
             VALUES ($1, $2, 'active', now())`,
            [currentFixture.organizationB, currentFixture.userA]
          )
      )
    ).rejects.toMatchObject({ code: "42501" });
  });

  it("keeps the outbox write-only for the API while the worker can consume across tenants", async () => {
    const currentFixture = requireFixture();

    await expect(
      appPool.query("SELECT id FROM events.outbox LIMIT 1")
    ).rejects.toMatchObject({ code: "42501" });

    const workerResult = await workerPool.query<{ aggregate_id: string }>(
      `SELECT aggregate_id::text AS aggregate_id
       FROM events.outbox
       WHERE event_name = 'organization.created'
         AND aggregate_id IN ($1, $2)
       ORDER BY aggregate_id`,
      [currentFixture.organizationA, currentFixture.organizationB]
    );

    expect(workerResult.rows.map((row) => row.aggregate_id).sort()).toEqual(
      [currentFixture.organizationA, currentFixture.organizationB].sort()
    );
  });

  it("rolls back domain state and outbox atomically", async () => {
    const currentFixture = requireFixture();

    await expect(
      withTenantTransaction(
        appPool,
        {
          organizationId: currentFixture.organizationA,
          userId: currentFixture.userA
        },
        async ({ client }) => {
          await client.query(
            "UPDATE organizations.organizations SET name = 'must rollback' WHERE id = $1",
            [currentFixture.organizationA]
          );
          await client.query(
            `INSERT INTO events.outbox
              (organization_id, event_name, event_version, aggregate_type, aggregate_id, actor_user_id)
             VALUES ($1, 'organization.rollback_probe', 1, 'organization', $1, $2)`,
            [currentFixture.organizationA, currentFixture.userA]
          );

          throw new Error("rollback probe");
        }
      )
    ).rejects.toThrow("rollback probe");

    const organization = await withTenantTransaction(
      appPool,
      {
        organizationId: currentFixture.organizationA,
        userId: currentFixture.userA
      },
      async ({ client }) =>
        client.query<{ name: string }>(
          "SELECT name FROM organizations.organizations WHERE id = $1",
          [currentFixture.organizationA]
        )
    );
    expect(organization.rows[0]?.name).toBe(currentFixture.organizationAName);

    const outbox = await workerPool.query<{ count: string }>(
      `SELECT count(*)::text AS count
       FROM events.outbox
       WHERE event_name = 'organization.rollback_probe'
         AND aggregate_id = $1`,
      [currentFixture.organizationA]
    );
    expect(outbox.rows[0]?.count).toBe("0");
  });
});
