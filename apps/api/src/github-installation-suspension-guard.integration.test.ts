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
    throw new Error(
      `${name} is required for GitHub suspension guard integration tests.`
    );
  }
  return value;
}

function externalId(): number {
  return 30_000_000_000 + Math.floor(Math.random() * 8_000_000_000);
}

describe("GitHub installation suspension source guard", () => {
  let migrationPool: DatabasePool;
  let appPool: DatabasePool;
  let workerPool: DatabasePool;
  let organizationId = "";
  let userId = "";
  let deliveryId = "";

  beforeAll(() => {
    migrationPool = createDatabasePool(requireEnv("DATABASE_MIGRATION_URL"));
    appPool = createDatabasePool(requireEnv("DATABASE_URL"));
    workerPool = createDatabasePool(requireEnv("DATABASE_WORKER_URL"));
  });

  afterAll(async () => {
    if (deliveryId !== "") {
      await migrationPool.query(
        `DELETE FROM integrations.github_webhook_inbox WHERE delivery_id = $1`,
        [deliveryId]
      );
    }
    if (organizationId !== "") {
      await migrationPool.query(
        `DELETE FROM organizations.organizations WHERE id = $1`,
        [organizationId]
      );
    }
    await Promise.all([migrationPool.end(), appPool.end(), workerPool.end()]);
  });

  it("does not let a GitHub unsuspend undo a local administrator suspension", async () => {
    const installationId = externalId();
    const repositoryId = externalId();
    const user = await migrationPool.query<{ id: string }>(
      `INSERT INTO identity.users (email, display_name)
       VALUES ($1, 'Suspension guard') RETURNING id::text`,
      [`suspension-${randomUUID()}@example.test`]
    );
    userId = user.rows[0]?.id ?? "";
    const organization = await migrationPool.query<{ id: string }>(
      `INSERT INTO organizations.organizations (slug, name, created_by_user_id)
       VALUES ($1, 'Suspension guard', $2) RETURNING id::text`,
      [`suspension-${randomUUID()}`, userId]
    );
    organizationId = organization.rows[0]?.id ?? "";
    await migrationPool.query(
      `INSERT INTO organizations.memberships (organization_id, user_id, status, joined_at)
       VALUES ($1, $2, 'active', now())`,
      [organizationId, userId]
    );
    await migrationPool.query(
      `INSERT INTO integrations.github_installations (
         organization_id, github_installation_id, status
       ) VALUES ($1, $2, 'active')`,
      [organizationId, installationId]
    );
    await migrationPool.query(
      `INSERT INTO integrations.github_repositories (
         organization_id, github_installation_id, github_repository_id, full_name, status
       ) VALUES ($1, $2, $3, 'example/suspension-guard', 'active')`,
      [organizationId, installationId, repositoryId]
    );

    await withTenantTransaction(
      appPool,
      { organizationId, userId },
      async (transaction) => {
        await transaction.client.query(
          `UPDATE integrations.github_installations
         SET status = 'suspended', updated_at = now()
         WHERE organization_id = $1 AND github_installation_id = $2`,
          [organizationId, installationId]
        );
        await transaction.client.query(
          `UPDATE integrations.github_repositories
         SET status = 'removed', updated_at = now()
         WHERE organization_id = $1 AND github_installation_id = $2`,
          [organizationId, installationId]
        );
      }
    );

    const source = await migrationPool.query<{
      suspension_source: string | null;
    }>(
      `SELECT suspension_source
       FROM integrations.github_installations
       WHERE organization_id = $1 AND github_installation_id = $2`,
      [organizationId, installationId]
    );
    expect(source.rows[0]?.suspension_source).toBe("local");

    deliveryId = randomUUID();
    const payload = JSON.stringify({
      action: "unsuspend",
      installation: { id: installationId }
    });
    await migrationPool.query(
      `INSERT INTO integrations.github_webhook_inbox (
         organization_id, delivery_id, event_name, action,
         github_installation_id, routing_status, payload_sha256, payload
       ) VALUES ($1, $2, 'installation', 'unsuspend', $3, 'mapped', $4, $5::jsonb)`,
      [
        organizationId,
        deliveryId,
        installationId,
        createHash("sha256").update(payload).digest("hex"),
        payload
      ]
    );

    const processor = new GitHubWebhookLifecycleProcessor(workerPool);
    expect(await processor.processOne()).toBe(true);

    const mapping = await migrationPool.query<{
      status: string;
      suspension_source: string | null;
      repository_status: string;
    }>(
      `SELECT
         installation.status,
         installation.suspension_source,
         repository.status AS repository_status
       FROM integrations.github_installations AS installation
       JOIN integrations.github_repositories AS repository
         ON repository.organization_id = installation.organization_id
        AND repository.github_installation_id = installation.github_installation_id
       WHERE installation.organization_id = $1
         AND installation.github_installation_id = $2`,
      [organizationId, installationId]
    );
    expect(mapping.rows[0]).toEqual({
      status: "suspended",
      suspension_source: "local",
      repository_status: "removed"
    });
  });
});
