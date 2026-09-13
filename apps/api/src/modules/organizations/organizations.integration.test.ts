import { randomUUID } from "node:crypto";

import { ForbiddenException } from "@nestjs/common";
import {
  createDatabasePool,
  type DatabaseTransaction
} from "@platform/database";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { DatabaseService } from "../../database/database.service";
import {
  OutboxRepository,
  type OutboxMessage
} from "../../outbox/outbox.repository";
import { PostgresOutboxRepository } from "../../outbox/postgres-outbox.repository";
import { attachPlatformPrincipal } from "../../request-context/platform-principal";
import { RequestContextService } from "../../request-context/request-context.service";
import { AuthorizationApplicationService } from "../authorization/application/authorization.service";
import { AuthorizationPolicy } from "../authorization/application/authorization.policy";
import { PostgresAuthorizationRepository } from "../authorization/infrastructure/postgres-authorization.repository";
import { IdentityApplicationService } from "../identity/application/identity.service";
import { PostgresIdentityRepository } from "../identity/infrastructure/postgres-identity.repository";
import { OrganizationsApplicationService } from "./application/organizations.service";
import { PostgresOrganizationsRepository } from "./infrastructure/postgres-organizations.repository";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (value === undefined || value.trim().length === 0) {
    throw new Error(`${name} is required for API integration tests.`);
  }
  return value;
}

type IdRow = { id: string };

type ProvisionedOrganizationRow = {
  organization_status: string;
  membership_status: string;
  role_key: string;
  scope_type: string;
  scope_id: string;
  event_name: string;
  event_version: number;
  payload: Record<string, unknown>;
};

class FailingOutboxRepository extends OutboxRepository {
  async append(
    _transaction: DatabaseTransaction,
    _message: OutboxMessage
  ): Promise<void> {
    throw new Error("forced outbox failure");
  }
}

describe("organization application persistence", () => {
  const migrationPool = createDatabasePool(
    requireEnv("DATABASE_MIGRATION_URL"),
    { applicationName: "api-organization-integration-fixtures" }
  );
  const database = new DatabaseService();
  const organizations = new PostgresOrganizationsRepository();
  const identity = new IdentityApplicationService(
    new PostgresIdentityRepository()
  );
  const authorization = new AuthorizationApplicationService(
    new PostgresAuthorizationRepository(),
    new AuthorizationPolicy()
  );
  const outbox = new PostgresOutboxRepository();

  const createdUserIds: string[] = [];
  let ownerUserId = "";
  let outsiderUserId = "";
  let successfulOrganizationId = "";

  async function createUser(label: string): Promise<string> {
    const result = await migrationPool.query<IdRow>(
      `INSERT INTO identity.users (email, display_name)
       VALUES ($1, $2)
       RETURNING id::text`,
      [`${label}-${randomUUID()}@example.test`, label]
    );
    const id = result.rows[0]?.id;
    if (id === undefined) {
      throw new Error("Failed to create integration-test identity user.");
    }
    createdUserIds.push(id);
    return id;
  }

  function serviceFor(
    userId: string,
    outboxRepository: OutboxRepository = outbox
  ): OrganizationsApplicationService {
    const request = {};
    attachPlatformPrincipal(request, { userId });

    return new OrganizationsApplicationService(
      database,
      new RequestContextService(request),
      organizations,
      identity,
      authorization,
      outboxRepository
    );
  }

  beforeAll(async () => {
    ownerUserId = await createUser("owner");
    outsiderUserId = await createUser("outsider");
  });

  afterAll(async () => {
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

    await database.onApplicationShutdown();
    await migrationPool.end();
  });

  it("creates organization, membership, owner assignment, and outbox atomically", async () => {
    const slug = `integration-${randomUUID()}`;
    const service = serviceFor(ownerUserId);

    const organization = await service.createOrganization({
      slug,
      name: "Integration Learning"
    });
    successfulOrganizationId = organization.id;

    expect(organization).toEqual({
      id: organization.id,
      slug,
      name: "Integration Learning",
      status: "active"
    });

    const persisted = await migrationPool.query<ProvisionedOrganizationRow>(
      `SELECT o.status AS organization_status,
              m.status AS membership_status,
              r.key AS role_key,
              ra.scope_type,
              ra.scope_id::text,
              e.event_name,
              e.event_version,
              e.payload
         FROM organizations.organizations o
         JOIN organizations.memberships m
           ON m.organization_id = o.id AND m.user_id = $2
         JOIN access_control.role_assignments ra
           ON ra.organization_id = o.id AND ra.user_id = $2
         JOIN access_control.roles r ON r.id = ra.role_id
         JOIN events.outbox e
           ON e.organization_id = o.id AND e.aggregate_id = o.id
        WHERE o.id = $1`,
      [organization.id, ownerUserId]
    );
    const row = persisted.rows[0];

    expect(row).toBeDefined();
    expect(row?.organization_status).toBe("active");
    expect(row?.membership_status).toBe("active");
    expect(row?.role_key).toBe("organization_owner");
    expect(row?.scope_type).toBe("organization");
    expect(row?.scope_id).toBe(organization.id);
    expect(row?.event_name).toBe("organization.created");
    expect(row?.event_version).toBe(1);
    expect(row?.payload).toMatchObject({
      organizationId: organization.id,
      slug,
      createdByUserId: ownerUserId
    });

    await expect(service.getOrganization(organization.id)).resolves.toEqual(
      organization
    );
  });

  it("keeps application authorization primary even when tenant RLS context matches", async () => {
    if (successfulOrganizationId.length === 0) {
      throw new Error("The provisioned organization fixture is missing.");
    }

    await expect(
      serviceFor(outsiderUserId).getOrganization(successfulOrganizationId)
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("rolls back organization provisioning when the outbox step fails", async () => {
    const slug = `rollback-${randomUUID()}`;
    const service = serviceFor(ownerUserId, new FailingOutboxRepository());

    await expect(
      service.createOrganization({
        slug,
        name: "Must Roll Back"
      })
    ).rejects.toThrow("forced outbox failure");

    const result = await migrationPool.query<{ count: string }>(
      `SELECT count(*)::text AS count
         FROM organizations.organizations
        WHERE slug = $1`,
      [slug]
    );

    expect(result.rows[0]?.count).toBe("0");
  });
});
