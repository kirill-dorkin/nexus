import { type DatabasePool, withTransaction } from "@platform/database";

// Database-fixture-only helper. HTTP controllers never import this module.
export async function createTestOrganization(
  pool: DatabasePool,
  ownerUserId: string,
  input: { slug: string; name: string }
): Promise<{ id: string; slug: string; name: string; status: "active" }> {
  return withTransaction(pool, async ({ client }) => {
    const created = await client.query<{ id: string }>(
      "INSERT INTO organizations.organizations (slug,name,created_by_user_id) VALUES ($1,$2,$3) RETURNING id::text",
      [input.slug, input.name, ownerUserId]
    );
    const id = created.rows[0]?.id;
    if (!id) throw new Error("Fixture Organization insert returned no identity.");
    await client.query(
      "INSERT INTO organizations.memberships (organization_id,user_id,status,joined_at) VALUES ($1,$2,'active',now())",
      [id, ownerUserId]
    );
    const assigned = await client.query(
      "INSERT INTO access_control.role_assignments (organization_id,user_id,role_id,scope_type,scope_id,assigned_by_user_id) SELECT $1,$2,id,'organization',$1,$2 FROM access_control.roles WHERE key='organization_owner' AND is_system=true",
      [id, ownerUserId]
    );
    if (assigned.rowCount !== 1) throw new Error("Fixture owner system role not seeded.");
    await client.query(
      "INSERT INTO events.outbox (organization_id,event_name,event_version,aggregate_type,aggregate_id,actor_user_id,payload) VALUES ($1,'organization.created',1,'organization',$1,$2,$3::jsonb)",
      [id, ownerUserId, JSON.stringify({ organizationId: id, slug: input.slug, name: input.name, createdByUserId: ownerUserId })]
    );
    return { id, slug: input.slug, name: input.name, status: "active" };
  });
}
