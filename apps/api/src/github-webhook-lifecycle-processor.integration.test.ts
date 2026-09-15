import { createHash, randomUUID } from "node:crypto";

import {
  createDatabasePool,
  withTenantTransaction,
  type DatabasePool
} from "@platform/database";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { GitHubWebhookLifecycleProcessor } from "./modules/integrations/infrastructure/github-webhook-lifecycle.processor";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (value === undefined || value.trim().length === 0) {
    throw new Error(`${name} is required for GitHub lifecycle processor integration tests.`);
  }
  return value;
}

function externalId(): number {
  return 20_000_000_000 + Math.floor(Math.random() * 8_000_000_000);
}

type TestTenant = Readonly<{ userId: string; organizationId: string }>;
type IdRow = { id: string };

describe("GitHub webhook lifecycle processor", () => {
  const testId = randomUUID();
  const deliveryIds: string[] = [];
  const organizationIds: string[] = [];
  let migrationPool: DatabasePool;
  let appPool: DatabasePool;
  let workerPool: DatabasePool;
  let processor: GitHubWebhookLifecycleProcessor;

  beforeAll(async () => {
    migrationPool = createDatabasePool(requireEnv("DATABASE_MIGRATION_URL"));
    appPool = createDatabasePool(requireEnv("DATABASE_URL"));
    workerPool = createDatabasePool(requireEnv("DATABASE_WORKER_URL"));
    processor = new GitHubWebhookLifecycleProcessor(workerPool, {
      leaseSeconds: 30,
      maxAttempts: 3,
      retryBaseMs: 1,
      retryMaxMs: 5
    });
  });

  afterAll(async () => {
    if (migrationPool !== undefined) {
      if (deliveryIds.length > 0) {
        await migrationPool.query(
          `DELETE FROM integrations.github_webhook_inbox
           WHERE delivery_id = ANY($1::uuid[])`,
          [deliveryIds]
        );
      }
      for (const organizationId of organizationIds) {
        await migrationPool.query(
          `DELETE FROM organizations.organizations WHERE id = $1`,
          [organizationId]
        );
      }
    }
    await Promise.all([
      migrationPool?.end(),
      appPool?.end(),
      workerPool?.end()
    ]);
  });

  async function createTenant(label: string): Promise<TestTenant> {
    const user = await migrationPool.query<IdRow>(
      `INSERT INTO identity.users (email, display_name)
       VALUES ($1, $2)
       RETURNING id::text`,
      [`lifecycle-${label}-${randomUUID()}@example.test`, `Lifecycle ${label}`]
    );
    const userId = user.rows[0]?.id;
    if (userId === undefined) throw new Error("Failed to create lifecycle test user.");

    const organization = await migrationPool.query<IdRow>(
      `INSERT INTO organizations.organizations (slug, name, created_by_user_id)
       VALUES ($1, $2, $3)
       RETURNING id::text`,
      [`lifecycle-${label}-${randomUUID()}`, `Lifecycle ${label}`, userId]
    );
    const organizationId = organization.rows[0]?.id;
    if (organizationId === undefined) throw new Error("Failed to create lifecycle test organization.");
    organizationIds.push(organizationId);

    await migrationPool.query(
      `INSERT INTO organizations.memberships (organization_id, user_id, status, joined_at)
       VALUES ($1, $2, 'active', now())`,
      [organizationId, userId]
    );
    return { userId, organizationId };
  }

  async function mapInstallation(
    tenant: TestTenant,
    installationId: number,
    repositories: readonly Readonly<{ id: number; fullName: string }>[] = []
  ): Promise<void> {
    await migrationPool.query(
      `INSERT INTO integrations.github_installations (
         organization_id, github_installation_id, status
       ) VALUES ($1, $2, 'active')`,
      [tenant.organizationId, installationId]
    );
    for (const repository of repositories) {
      await migrationPool.query(
        `INSERT INTO integrations.github_repositories (
           organization_id, github_installation_id, github_repository_id, full_name, status
         ) VALUES ($1, $2, $3, $4, 'active')`,
        [tenant.organizationId, installationId, repository.id, repository.fullName]
      );
    }
  }

  async function insertInbox(input: Readonly<{
    organizationId: string | null;
    eventName: string;
    action: string;
    installationId: number;
    repositoryId?: number | null;
    routingStatus: string;
    payload: Readonly<Record<string, unknown>>;
  }>): Promise<string> {
    const deliveryId = randomUUID();
    deliveryIds.push(deliveryId);
    const raw = JSON.stringify(input.payload);
    const result = await migrationPool.query<IdRow>(
      `INSERT INTO integrations.github_webhook_inbox (
         organization_id,
         delivery_id,
         event_name,
         action,
         github_installation_id,
         github_repository_id,
         routing_status,
         payload_sha256,
         payload
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb)
       RETURNING id::text`,
      [
        input.organizationId,
        deliveryId,
        input.eventName,
        input.action,
        input.installationId,
        input.repositoryId ?? null,
        input.routingStatus,
        createHash("sha256").update(raw).digest("hex"),
        raw
      ]
    );
    const id = result.rows[0]?.id;
    if (id === undefined) throw new Error("Failed to create lifecycle inbox row.");
    return id;
  }

  async function processingStatus(inboxId: string): Promise<{
    status: string;
    attempt_count: number;
    last_error_code: string | null;
  }> {
    const result = await migrationPool.query<{
      status: string;
      attempt_count: number;
      last_error_code: string | null;
    }>(
      `SELECT status, attempt_count, last_error_code
       FROM integrations.github_webhook_lifecycle_processing
       WHERE inbox_id = $1`,
      [inboxId]
    );
    const row = result.rows[0];
    if (row === undefined) throw new Error("Lifecycle processing state not found.");
    return row;
  }

  it("blocks unmapped lifecycle input, reroutes it explicitly, and processes it once", async () => {
    const tenant = await createTenant("reroute");
    const installationId = externalId();
    const repositoryId = externalId();
    const inboxId = await insertInbox({
      organizationId: null,
      eventName: "installation",
      action: "suspend",
      installationId,
      routingStatus: "unmapped_installation",
      payload: { action: "suspend", installation: { id: installationId } }
    });

    expect(await processor.processOne()).toBe(true);
    expect((await processingStatus(inboxId)).status).toBe("blocked");

    await mapInstallation(tenant, installationId, [
      { id: repositoryId, fullName: `org-${testId}/repo-reroute` }
    ]);
    await withTenantTransaction(
      appPool,
      tenant,
      async (transaction) => {
        await transaction.client.query(
          `SELECT platform_internal.refresh_github_webhook_routes_for_installation($1, $2)`,
          [tenant.organizationId, installationId]
        );
      }
    );

    const route = await migrationPool.query<{ routing_status: string; organization_id: string | null }>(
      `SELECT routing_status, organization_id::text
       FROM integrations.github_webhook_routing_state
       WHERE inbox_id = $1`,
      [inboxId]
    );
    expect(route.rows[0]).toMatchObject({
      routing_status: "mapped",
      organization_id: tenant.organizationId
    });
    expect((await processingStatus(inboxId)).status).toBe("pending");

    expect(await processor.processOne()).toBe(true);
    expect(await processingStatus(inboxId)).toMatchObject({ status: "completed", attempt_count: 2 });
    const mapping = await migrationPool.query<{ installation_status: string; repository_status: string }>(
      `SELECT installation.status AS installation_status, repository.status AS repository_status
       FROM integrations.github_installations AS installation
       JOIN integrations.github_repositories AS repository
         ON repository.organization_id = installation.organization_id
        AND repository.github_installation_id = installation.github_installation_id
       WHERE installation.organization_id = $1
         AND installation.github_installation_id = $2`,
      [tenant.organizationId, installationId]
    );
    expect(mapping.rows[0]).toEqual({
      installation_status: "suspended",
      repository_status: "suspended"
    });
  });

  it("reclaims an expired lease after a simulated crash", async () => {
    const tenant = await createTenant("lease");
    const installationId = externalId();
    await mapInstallation(tenant, installationId);
    const inboxId = await insertInbox({
      organizationId: tenant.organizationId,
      eventName: "installation",
      action: "deleted",
      installationId,
      routingStatus: "mapped",
      payload: { action: "deleted", installation: { id: installationId } }
    });

    await migrationPool.query(
      `UPDATE integrations.github_webhook_lifecycle_processing
       SET status = 'processing',
           attempt_count = 1,
           lease_token = $2,
           lease_expires_at = now() - interval '1 second'
       WHERE inbox_id = $1`,
      [inboxId, randomUUID()]
    );

    expect(await processor.processOne()).toBe(true);
    expect(await processingStatus(inboxId)).toMatchObject({ status: "completed", attempt_count: 2 });
    const installation = await migrationPool.query<{ status: string }>(
      `SELECT status FROM integrations.github_installations
       WHERE organization_id = $1 AND github_installation_id = $2`,
      [tenant.organizationId, installationId]
    );
    expect(installation.rows[0]?.status).toBe("removed");
  });

  it("rolls back a failed mutation, retries, and then completes", async () => {
    const tenant = await createTenant("retry");
    const installationId = externalId();
    await mapInstallation(tenant, installationId);
    const inboxId = await insertInbox({
      organizationId: tenant.organizationId,
      eventName: "installation",
      action: "deleted",
      installationId,
      routingStatus: "mapped",
      payload: { action: "deleted", installation: { id: installationId } }
    });
    const functionName = `fail_lifecycle_${randomUUID().replaceAll("-", "_")}`;
    const triggerName = `fail_lifecycle_${randomUUID().replaceAll("-", "_")}`;

    await migrationPool.query(
      `CREATE FUNCTION platform_internal.${functionName}()
       RETURNS trigger LANGUAGE plpgsql AS $$
       BEGIN
         IF NEW.github_installation_id = ${installationId} THEN
           RAISE EXCEPTION 'simulated lifecycle failure';
         END IF;
         RETURN NEW;
       END
       $$`
    );
    await migrationPool.query(
      `CREATE TRIGGER ${triggerName}
       BEFORE UPDATE ON integrations.github_installations
       FOR EACH ROW EXECUTE FUNCTION platform_internal.${functionName}()`
    );

    expect(await processor.processOne()).toBe(true);
    expect((await processingStatus(inboxId)).status).toBe("retryable");
    const beforeRetry = await migrationPool.query<{ status: string }>(
      `SELECT status FROM integrations.github_installations
       WHERE organization_id = $1 AND github_installation_id = $2`,
      [tenant.organizationId, installationId]
    );
    expect(beforeRetry.rows[0]?.status).toBe("active");

    await migrationPool.query(`DROP TRIGGER ${triggerName} ON integrations.github_installations`);
    await migrationPool.query(`DROP FUNCTION platform_internal.${functionName}()`);
    await migrationPool.query(
      `UPDATE integrations.github_webhook_lifecycle_processing
       SET available_at = now()
       WHERE inbox_id = $1`,
      [inboxId]
    );

    expect(await processor.processOne()).toBe(true);
    expect(await processingStatus(inboxId)).toMatchObject({ status: "completed", attempt_count: 2 });
  });

  it("applies repository add/remove and reroutes retained repository deliveries", async () => {
    const tenant = await createTenant("repositories");
    const installationId = externalId();
    const repositoryId = externalId();
    await mapInstallation(tenant, installationId);

    const retainedPullRequest = await insertInbox({
      organizationId: tenant.organizationId,
      eventName: "pull_request",
      action: "opened",
      installationId,
      repositoryId,
      routingStatus: "unmapped_repository",
      payload: {
        action: "opened",
        installation: { id: installationId },
        repository: { id: repositoryId }
      }
    });
    const added = await insertInbox({
      organizationId: tenant.organizationId,
      eventName: "installation_repositories",
      action: "added",
      installationId,
      routingStatus: "mapped",
      payload: {
        action: "added",
        installation: { id: installationId },
        repositories_added: [{ id: repositoryId, full_name: `org-${testId}/repo-added` }],
        repositories_removed: []
      }
    });

    expect(await processor.processOne()).toBe(true);
    expect((await processingStatus(added)).status).toBe("completed");
    const route = await migrationPool.query<{ routing_status: string }>(
      `SELECT routing_status FROM integrations.github_webhook_routing_state WHERE inbox_id = $1`,
      [retainedPullRequest]
    );
    expect(route.rows[0]?.routing_status).toBe("mapped");

    const removed = await insertInbox({
      organizationId: tenant.organizationId,
      eventName: "installation_repositories",
      action: "removed",
      installationId,
      routingStatus: "mapped",
      payload: {
        action: "removed",
        installation: { id: installationId },
        repositories_added: [],
        repositories_removed: [{ id: repositoryId, full_name: `org-${testId}/repo-added` }]
      }
    });
    expect(await processor.processOne()).toBe(true);
    expect((await processingStatus(removed)).status).toBe("completed");

    const repository = await migrationPool.query<{ status: string }>(
      `SELECT status FROM integrations.github_repositories
       WHERE organization_id = $1 AND github_repository_id = $2`,
      [tenant.organizationId, repositoryId]
    );
    expect(repository.rows[0]?.status).toBe("removed");
    const retainedRoute = await migrationPool.query<{ routing_status: string }>(
      `SELECT routing_status FROM integrations.github_webhook_routing_state WHERE inbox_id = $1`,
      [retainedPullRequest]
    );
    expect(retainedRoute.rows[0]?.routing_status).toBe("mapped");
  });

  it("rejects mismatched routing without mutating tenant mappings", async () => {
    const tenant = await createTenant("mismatch");
    const installationId = externalId();
    await mapInstallation(tenant, installationId);
    const inboxId = await insertInbox({
      organizationId: tenant.organizationId,
      eventName: "installation",
      action: "deleted",
      installationId,
      routingStatus: "repository_mismatch",
      payload: { action: "deleted", installation: { id: installationId } }
    });

    expect(await processor.processOne()).toBe(true);
    expect(await processingStatus(inboxId)).toMatchObject({
      status: "rejected",
      last_error_code: "routing_rejected"
    });
    const installation = await migrationPool.query<{ status: string }>(
      `SELECT status FROM integrations.github_installations
       WHERE organization_id = $1 AND github_installation_id = $2`,
      [tenant.organizationId, installationId]
    );
    expect(installation.rows[0]?.status).toBe("active");
  });
});
