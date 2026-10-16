import { randomUUID } from "node:crypto";
import { createDatabasePool } from "@platform/database";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { provisionOwnerOrganization } from "./provision-owner-organization";

function requiredEnv(name: string): string {
  const result = process.env[name];
  if (!result) throw new Error(name + " required for integration tests.");
  return result;
}

describe("operator-only Organization owner provisioning", () => {
  const migration = createDatabasePool(requiredEnv("DATABASE_MIGRATION_URL"));
  const runtime = createDatabasePool(requiredEnv("DATABASE_URL"));
  const slug = "operator-org-" + randomUUID();
  const title = "Operator Academy";
  const ownerEmail = "operator-" + randomUUID() + "@example.test";
  const outsiderEmail = "other-operator-" + randomUUID() + "@example.test";
  let ownerId = "";
  let otherId = "";
  let organizationId = "";

  beforeAll(async () => {
    for (const [email, which] of [[ownerEmail, "owner"], [outsiderEmail, "other"]] as const) {
      const result = await migration.query<{ id: string }>(
        "INSERT INTO identity.users (email,display_name) VALUES ($1,'Operator Test') RETURNING id::text",
        [email]
      );
      const id = result.rows[0]?.id;
      if (!id) throw new Error("Failed to seed test user.");
      if (which === "owner") ownerId = id;
      else otherId = id;
    }
  });

  afterAll(async () => {
    try {
      if (organizationId) {
        await migration.query("DELETE FROM events.outbox WHERE organization_id=$1", [organizationId]);
        await migration.query("DELETE FROM organizations.organizations WHERE id=$1", [organizationId]);
      }
      await migration.query("DELETE FROM identity.users WHERE id=ANY($1::uuid[])", [[ownerId, otherId].filter(Boolean)]);
    } finally {
      await Promise.all([runtime.end(), migration.end()]);
    }
  });

  it("creates exactly one active Organization, owner Membership, role and canonical outbox event", async () => {
    const created = await provisionOwnerOrganization(migration, { ownerUserId: ownerId, slug, name: title });
    organizationId = created.id;
    expect(created).toMatchObject({ slug, outcome: "created" });

    const result = await migration.query<{
      status: string;
      membership: string;
      role_count: string;
      event_count: string;
      event_payload: { organizationId: string; createdByUserId: string };
    }>(
      [
        "SELECT o.status, m.status AS membership,",
        "(SELECT count(*)::text FROM access_control.role_assignments ra",
        " JOIN access_control.roles r ON r.id=ra.role_id",
        " WHERE ra.organization_id=o.id AND ra.user_id=$2",
        " AND ra.scope_type='organization' AND ra.scope_id=o.id",
        " AND r.key='organization_owner') AS role_count,",
        "(SELECT count(*)::text FROM events.outbox e WHERE e.organization_id=o.id",
        " AND e.aggregate_id=o.id AND e.event_name='organization.created') AS event_count,",
        "(SELECT e.payload FROM events.outbox e WHERE e.organization_id=o.id",
        " AND e.aggregate_id=o.id AND e.event_name='organization.created' LIMIT 1) AS event_payload",
        "FROM organizations.organizations o JOIN organizations.memberships m",
        " ON m.organization_id=o.id AND m.user_id=$2 WHERE o.id=$1"
      ].join("\n"),
      [organizationId, ownerId]
    );
    expect(result.rows[0]).toMatchObject({
      status: "active", membership: "active", role_count: "1", event_count: "1",
      event_payload: { organizationId, createdByUserId: ownerId }
    });

    const replay = await provisionOwnerOrganization(migration, { ownerUserId: ownerId, slug, name: title });
    expect(replay).toEqual({ id: organizationId, slug, outcome: "already_provisioned" });
    const eventCount = await migration.query<{ total: string }>(
      "SELECT count(*)::text AS total FROM events.outbox WHERE organization_id=$1",
      [organizationId]
    );
    expect(eventCount.rows[0]?.total).toBe("1");
  });

  it("rejects replay with another owner or a changed name without granting privilege", async () => {
    await expect(provisionOwnerOrganization(migration, {
      ownerUserId: otherId, slug, name: title
    })).rejects.toThrow("not an exact");
    await expect(provisionOwnerOrganization(migration, {
      ownerUserId: ownerId, slug, name: "Changed Academy"
    })).rejects.toThrow("not an exact");
    const roles = await migration.query<{ total: string }>(
      "SELECT count(*)::text AS total FROM access_control.role_assignments WHERE organization_id=$1",
      [organizationId]
    );
    expect(roles.rows[0]?.total).toBe("1");
  });

  it("does not adopt a suspended user or allow the restricted app role", async () => {
    await migration.query("UPDATE identity.users SET status='suspended' WHERE id=$1", [otherId]);
    await expect(provisionOwnerOrganization(migration, {
      ownerUserId: otherId, slug: "suspended-" + randomUUID(), name: title
    })).rejects.toThrow("active Identity");
    await expect(provisionOwnerOrganization(runtime, {
      ownerUserId: ownerId, slug: "untrusted-" + randomUUID(), name: title
    })).rejects.toThrow("platform_migrator");
  });
});
