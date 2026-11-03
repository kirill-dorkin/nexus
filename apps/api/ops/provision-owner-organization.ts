import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  createOrganizationRequestSchema,
  uuidSchema
} from "@platform/contracts";
import {
  createDatabasePool,
  withTransaction,
  type DatabasePool
} from "@platform/database";

// Operational command only. Never imported by the deployed API, Web or Worker.
// The migration-role credential must be held by an authorized operator.
export type OwnerOrganizationProvision = {
  ownerUserId: string;
  slug: string;
  name: string;
};

export type ProvisionOutcome = {
  id: string;
  slug: string;
  outcome: "created" | "already_provisioned";
};

export function parseOwnerProvisionArgs(argv: string[]): OwnerOrganizationProvision {
  const keys = new Set(["--owner-user-id", "--slug", "--name"]);
  const provided = new Map<string, string>();
  let apply = false;
  for (let i = 0; i < argv.length; i++) {
    const flag = argv[i] ?? "";
    if (flag === "--apply" && !apply) {
      apply = true;
      continue;
    }
    const value = argv[i + 1];
    if (!keys.has(flag) || provided.has(flag) || !value || value.startsWith("--")) {
      throw new Error("Usage: --owner-user-id UUID --slug SLUG --name NAME --apply");
    }
    provided.set(flag, value);
    i += 1;
  }
  if (!apply || provided.size !== 3) {
    throw new Error("Explicit --apply and owner, slug and name are required.");
  }
  const ownerUserId = uuidSchema.parse(provided.get("--owner-user-id"));
  const { slug, name } = createOrganizationRequestSchema.parse({
    slug: provided.get("--slug"),
    name: provided.get("--name")
  });
  return { ownerUserId, slug, name };
}

// Canonical Organization, active owner Membership, organization-scoped role and
// organization.created outbox are one database transaction, matching the
// existing OrganizationsApplicationService bootstrap contract.
export async function provisionOwnerOrganization(
  pool: DatabasePool,
  input: OwnerOrganizationProvision
): Promise<ProvisionOutcome> {
  const ownerUserId = uuidSchema.parse(input.ownerUserId);
  const { slug, name } = createOrganizationRequestSchema.parse({
    slug: input.slug,
    name: input.name
  });

  return withTransaction(pool, async ({ client }) => {
    const role = await client.query<{ role: string }>("SELECT current_user AS role");
    if (role.rows[0]?.role !== "platform_migrator") {
      throw new Error("Owner provisioning requires the dedicated platform_migrator role.");
    }

    const user = await client.query<{ status: string }>(
      "SELECT status FROM identity.users WHERE id=$1 FOR SHARE",
      [ownerUserId]
    );
    if (user.rows[0]?.status !== "active") {
      throw new Error("The proposed owner must already be an active Identity user.");
    }

    // PostgreSQL unique slug is the concurrency fence. A retry is read-only
    // only when every original owner-provisioning invariant still matches.
    const existing = await client.query<{
      id: string; name: string; status: string; created_by_user_id: string;
      has_membership: boolean; has_role: boolean; has_event: boolean;
    }>(
      [
        "SELECT o.id::text, o.name, o.status, o.created_by_user_id::text,",
        "EXISTS (SELECT 1 FROM organizations.memberships m",
        "  WHERE m.organization_id=o.id AND m.user_id=$2 AND m.status='active') AS has_membership,",
        "EXISTS (SELECT 1 FROM access_control.role_assignments a",
        "  JOIN access_control.roles r ON r.id=a.role_id",
        "  WHERE a.organization_id=o.id AND a.user_id=$2",
        "    AND r.key='organization_owner' AND r.is_system=true",
        "    AND a.scope_type='organization' AND a.scope_id=o.id) AS has_role,",
        "EXISTS (SELECT 1 FROM events.outbox e",
        "  WHERE e.organization_id=o.id AND e.aggregate_id=o.id",
        "    AND e.event_name='organization.created' AND e.event_version=1",
        "    AND e.aggregate_type='organization' AND e.actor_user_id=$2",
        "    AND e.payload->>'organizationId'=o.id::text",
        "    AND e.payload->>'createdByUserId'=$2::text",
        "    AND e.payload->>'slug'=o.slug AND e.payload->>'name'=o.name) AS has_event",
        "FROM organizations.organizations o WHERE o.slug=$1 FOR UPDATE"
      ].join("\n"),
      [slug, ownerUserId]
    );
    const already = existing.rows[0];
    if (already) {
      if (
        already.status !== "active" ||
        already.name !== name ||
        already.created_by_user_id !== ownerUserId ||
        !already.has_membership || !already.has_role || !already.has_event
      ) {
        throw new Error("Existing Organization is not an exact owner-provisioning replay.");
      }
      return { id: already.id, slug, outcome: "already_provisioned" };
    }

    const created = await client.query<{ id: string }>(
      "INSERT INTO organizations.organizations (slug,name,created_by_user_id) VALUES ($1,$2,$3) RETURNING id::text",
      [slug, name, ownerUserId]
    );
    const id = created.rows[0]?.id;
    if (!id) throw new Error("Organization insert did not return an identity.");

    await client.query(
      "INSERT INTO organizations.memberships (organization_id,user_id,status,joined_at) VALUES ($1,$2,'active',now())",
      [id, ownerUserId]
    );

    const assignment = await client.query(
      [
        "INSERT INTO access_control.role_assignments",
        " (organization_id,user_id,role_id,scope_type,scope_id,assigned_by_user_id)",
        " SELECT $1,$2,r.id,'organization',$1,$2 FROM access_control.roles r",
        " WHERE r.key='organization_owner' AND r.is_system=true"
      ].join("\n"),
      [id, ownerUserId]
    );
    if (assignment.rowCount !== 1) {
      throw new Error("Canonical organization_owner system role is unavailable.");
    }

    await client.query(
      [
        "INSERT INTO events.outbox",
        " (organization_id,event_name,event_version,aggregate_type,aggregate_id,actor_user_id,payload,metadata)",
        " VALUES ($1,'organization.created',1,'organization',$1,$2,$3::jsonb,'{}'::jsonb)"
      ].join("\n"),
      [id, ownerUserId, JSON.stringify({ organizationId: id, slug, name, createdByUserId: ownerUserId })]
    );
    return { id, slug, outcome: "created" };
  });
}

async function cli() {
  const input = parseOwnerProvisionArgs(process.argv.slice(2));
  const url = process.env.DATABASE_MIGRATION_URL;
  if (!url) throw new Error("DATABASE_MIGRATION_URL is required (not DATABASE_URL).");
  const pool = createDatabasePool(url, { applicationName: "operator-owner-bootstrap", maxConnections: 1 });
  try {
    const result = await provisionOwnerOrganization(pool, input);
    process.stdout.write(JSON.stringify(result) + "\n");
  } finally {
    await pool.end();
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  void cli().catch((error: unknown) => {
    // Never dump database URLs, input arguments or connection objects.
    const message = error instanceof Error ? error.message : "Owner provisioning failed.";
    console.error(message);
    process.exitCode = 1;
  });
}
