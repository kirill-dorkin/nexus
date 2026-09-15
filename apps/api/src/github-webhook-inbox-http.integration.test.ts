import { createHash, createHmac, randomUUID } from "node:crypto";

import type { NestFastifyApplication } from "@nestjs/platform-fastify";
import { createDatabasePool, type DatabasePool } from "@platform/database";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createApiApplication } from "./app.factory";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (value === undefined || value.trim().length === 0) {
    throw new Error(`${name} is required for GitHub webhook integration tests.`);
  }
  return value;
}

function externalId(): number {
  return 1_000_000_000 + Math.floor(Math.random() * 7_000_000_000);
}

type IdRow = { id: string };
type InboxRow = {
  organization_id: string | null;
  delivery_id: string;
  event_name: string;
  action: string | null;
  github_installation_id: string | null;
  github_repository_id: string | null;
  routing_status: string;
  payload_sha256: string;
  payload: Record<string, unknown>;
};

describe("GitHub webhook durable inbox ingress", () => {
  const webhookSecret = "test-github-webhook-secret-with-sufficient-entropy";
  const testNamespace = randomUUID();
  const installationA = externalId();
  const installationB = externalId();
  const repositoryA = externalId();
  const repositoryB = externalId();
  let previousWebhookSecret: string | undefined;
  let migrationPool: DatabasePool;
  let app: NestFastifyApplication;
  let userA = "";
  let userB = "";
  let organizationA = "";
  let organizationB = "";

  async function createTenant(label: string): Promise<{ userId: string; organizationId: string }> {
    const user = await migrationPool.query<IdRow>(
      `INSERT INTO identity.users (email, display_name)
       VALUES ($1, $2)
       RETURNING id::text`,
      [`github-${label}-${randomUUID()}@example.test`, `GitHub ${label}`]
    );
    const userId = user.rows[0]?.id;
    if (userId === undefined) throw new Error("Failed to create GitHub webhook test user.");

    const organization = await migrationPool.query<IdRow>(
      `INSERT INTO organizations.organizations (slug, name, created_by_user_id)
       VALUES ($1, $2, $3)
       RETURNING id::text`,
      [`github-${label}-${randomUUID()}`, `GitHub ${label}`, userId]
    );
    const organizationId = organization.rows[0]?.id;
    if (organizationId === undefined) throw new Error("Failed to create GitHub webhook test organization.");

    return { userId, organizationId };
  }

  function signedHeaders(
    rawBody: string,
    deliveryId: string,
    eventName: string
  ): Record<string, string> {
    return {
      "content-type": "application/json",
      "x-github-delivery": deliveryId,
      "x-github-event": eventName,
      "x-hub-signature-256": `sha256=${createHmac("sha256", webhookSecret)
        .update(rawBody)
        .digest("hex")}`
    };
  }

  async function inboxByDelivery(deliveryId: string): Promise<InboxRow | null> {
    const result = await migrationPool.query<InboxRow>(
      `SELECT
         organization_id::text,
         delivery_id::text,
         event_name,
         action,
         github_installation_id::text,
         github_repository_id::text,
         routing_status,
         payload_sha256,
         payload
       FROM integrations.github_webhook_inbox
       WHERE delivery_id = $1`,
      [deliveryId]
    );
    return result.rows[0] ?? null;
  }

  beforeAll(async () => {
    previousWebhookSecret = process.env.GITHUB_WEBHOOK_SECRET;
    process.env.GITHUB_WEBHOOK_SECRET = webhookSecret;
    migrationPool = createDatabasePool(requireEnv("DATABASE_MIGRATION_URL"), {
      applicationName: "github-webhook-inbox-integration-fixtures"
    });

    ({ userId: userA, organizationId: organizationA } = await createTenant("tenant-a"));
    ({ userId: userB, organizationId: organizationB } = await createTenant("tenant-b"));

    await migrationPool.query(
      `INSERT INTO integrations.github_installations (organization_id, github_installation_id)
       VALUES ($1, $2), ($3, $4)`,
      [organizationA, installationA, organizationB, installationB]
    );
    await migrationPool.query(
      `INSERT INTO integrations.github_repositories (
         organization_id,
         github_installation_id,
         github_repository_id,
         full_name
       )
       VALUES ($1, $2, $3, $4), ($5, $6, $7, $8)`,
      [
        organizationA,
        installationA,
        repositoryA,
        `tenant-a/repo-${testNamespace}`,
        organizationB,
        installationB,
        repositoryB,
        `tenant-b/repo-${testNamespace}`
      ]
    );

    app = await createApiApplication();
    await app.init();
  });

  afterAll(async () => {
    if (app !== undefined) await app.close();
    if (migrationPool !== undefined) {
      await migrationPool.query(
        `DELETE FROM integrations.github_webhook_inbox
         WHERE payload ->> 'testNamespace' = $1`,
        [testNamespace]
      );
      await migrationPool.query(
        `DELETE FROM integrations.github_repositories
         WHERE organization_id = ANY($1::uuid[])`,
        [[organizationA, organizationB]]
      );
      await migrationPool.query(
        `DELETE FROM integrations.github_installations
         WHERE organization_id = ANY($1::uuid[])`,
        [[organizationA, organizationB]]
      );
      await migrationPool.query(
        `DELETE FROM organizations.organizations
         WHERE id = ANY($1::uuid[])`,
        [[organizationA, organizationB]]
      );
      await migrationPool.query(
        `DELETE FROM identity.users
         WHERE id = ANY($1::uuid[])`,
        [[userA, userB]]
      );
      await migrationPool.end();
    }

    if (previousWebhookSecret === undefined) {
      delete process.env.GITHUB_WEBHOOK_SECRET;
    } else {
      process.env.GITHUB_WEBHOOK_SECRET = previousWebhookSecret;
    }
  });

  it("rejects an invalid signature before durable inbox acceptance", async () => {
    const deliveryId = randomUUID();
    const rawBody = JSON.stringify({
      action: "opened",
      installation: { id: installationA },
      repository: { id: repositoryA },
      testNamespace
    });

    const response = await app.inject({
      method: "POST",
      url: "/v1/integrations/github/webhooks",
      headers: {
        "content-type": "application/json",
        "x-github-delivery": deliveryId,
        "x-github-event": "pull_request",
        "x-hub-signature-256": `sha256=${"0".repeat(64)}`
      },
      payload: rawBody
    });

    expect(response.statusCode).toBe(401);
    expect(await inboxByDelivery(deliveryId)).toBeNull();
  });

  it("rejects unsupported event types even when the body is correctly signed", async () => {
    const deliveryId = randomUUID();
    const rawBody = JSON.stringify({
      installation: { id: installationA },
      repository: { id: repositoryA },
      testNamespace
    });

    const response = await app.inject({
      method: "POST",
      url: "/v1/integrations/github/webhooks",
      headers: signedHeaders(rawBody, deliveryId, "push"),
      payload: rawBody
    });

    expect(response.statusCode).toBe(400);
    expect(await inboxByDelivery(deliveryId)).toBeNull();
  });

  it("persists a mapped delivery once and makes an identical retry idempotent", async () => {
    const deliveryId = randomUUID();
    const payload = {
      action: "opened",
      installation: { id: installationA },
      repository: { id: repositoryA },
      testNamespace
    };
    const rawBody = JSON.stringify(payload);
    const headers = signedHeaders(rawBody, deliveryId, "pull_request");

    const first = await app.inject({
      method: "POST",
      url: "/v1/integrations/github/webhooks",
      headers,
      payload: rawBody
    });
    const retry = await app.inject({
      method: "POST",
      url: "/v1/integrations/github/webhooks",
      headers,
      payload: rawBody
    });

    expect(first.statusCode).toBe(202);
    expect(retry.statusCode).toBe(202);

    const row = await inboxByDelivery(deliveryId);
    expect(row).toMatchObject({
      organization_id: organizationA,
      delivery_id: deliveryId,
      event_name: "pull_request",
      action: "opened",
      github_installation_id: String(installationA),
      github_repository_id: String(repositoryA),
      routing_status: "mapped",
      payload_sha256: createHash("sha256").update(rawBody).digest("hex"),
      payload
    });

    const count = await migrationPool.query<{ count: string }>(
      `SELECT count(*)::text AS count
       FROM integrations.github_webhook_inbox
       WHERE delivery_id = $1`,
      [deliveryId]
    );
    expect(count.rows[0]?.count).toBe("1");
  });

  it("rejects reuse of a delivery id with different signed content", async () => {
    const deliveryId = randomUUID();
    const original = JSON.stringify({
      action: "opened",
      installation: { id: installationA },
      repository: { id: repositoryA },
      testNamespace
    });
    const changed = JSON.stringify({
      action: "closed",
      installation: { id: installationA },
      repository: { id: repositoryA },
      testNamespace
    });

    const accepted = await app.inject({
      method: "POST",
      url: "/v1/integrations/github/webhooks",
      headers: signedHeaders(original, deliveryId, "pull_request"),
      payload: original
    });
    const conflict = await app.inject({
      method: "POST",
      url: "/v1/integrations/github/webhooks",
      headers: signedHeaders(changed, deliveryId, "pull_request"),
      payload: changed
    });

    expect(accepted.statusCode).toBe(202);
    expect(conflict.statusCode).toBe(409);
    expect((await inboxByDelivery(deliveryId))?.action).toBe("opened");
  });

  it("quarantines a repository mapped to a different tenant instead of cross-routing it", async () => {
    const deliveryId = randomUUID();
    const rawBody = JSON.stringify({
      action: "opened",
      installation: { id: installationA },
      repository: { id: repositoryB },
      testNamespace
    });

    const response = await app.inject({
      method: "POST",
      url: "/v1/integrations/github/webhooks",
      headers: signedHeaders(rawBody, deliveryId, "pull_request"),
      payload: rawBody
    });

    expect(response.statusCode).toBe(202);
    expect(await inboxByDelivery(deliveryId)).toMatchObject({
      organization_id: organizationA,
      github_installation_id: String(installationA),
      github_repository_id: String(repositoryB),
      routing_status: "repository_mismatch"
    });
  });

  it("retains verified unmapped and ping deliveries without inventing tenant ownership", async () => {
    const unmappedDeliveryId = randomUUID();
    const unmappedInstallation = externalId();
    const unmappedRawBody = JSON.stringify({
      action: "created",
      installation: { id: unmappedInstallation },
      testNamespace
    });
    const pingDeliveryId = randomUUID();
    const pingRawBody = JSON.stringify({ zen: "Keep it logically awesome.", testNamespace });

    const unmapped = await app.inject({
      method: "POST",
      url: "/v1/integrations/github/webhooks",
      headers: signedHeaders(unmappedRawBody, unmappedDeliveryId, "installation"),
      payload: unmappedRawBody
    });
    const ping = await app.inject({
      method: "POST",
      url: "/v1/integrations/github/webhooks",
      headers: signedHeaders(pingRawBody, pingDeliveryId, "ping"),
      payload: pingRawBody
    });

    expect(unmapped.statusCode).toBe(202);
    expect(await inboxByDelivery(unmappedDeliveryId)).toMatchObject({
      organization_id: null,
      github_installation_id: String(unmappedInstallation),
      routing_status: "unmapped_installation"
    });
    expect(ping.statusCode).toBe(202);
    expect(await inboxByDelivery(pingDeliveryId)).toMatchObject({
      organization_id: null,
      github_installation_id: null,
      github_repository_id: null,
      routing_status: "not_applicable"
    });
  });
});
