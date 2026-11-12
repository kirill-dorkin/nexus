import { randomUUID } from "node:crypto";

import type { NestFastifyApplication } from "@nestjs/platform-fastify";
import {
  catalogAccessSchema,
  subscriptionPlanPriceSchema,
  subscriptionPlanSchema
} from "@platform/contracts";
import { createDatabasePool } from "@platform/database";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createTestOrganization } from "./test-support/create-test-organization";
import { createApiApplication } from "./app.factory";
import {
  attachPlatformPrincipal,
  type PlatformPrincipalCarrier
} from "./request-context/platform-principal";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (value === undefined || value.trim().length === 0)
    throw new Error(`${name} is required for subscription integration tests.`);
  return value;
}

/** ADR-0087: plans, immutable prices, the trial and subscription-backed catalog access. */
describe("subscription access HTTP and SQL lifecycle", () => {
  const migrationPool = createDatabasePool(
    requireEnv("DATABASE_MIGRATION_URL"),
    { applicationName: "subscription-integration-fixtures" }
  );
  const appPool = createDatabasePool(requireEnv("DATABASE_URL"), {
    applicationName: "subscription-integration-app"
  });

  let app: NestFastifyApplication;
  let ownerUserId = "";
  let learnerUserId = "";
  let organizationId = "";
  let organizationSlug = "";
  let planId = "";
  let monthPriceId = "";

  async function createUser(label: string): Promise<string> {
    const result = await migrationPool.query<{ id: string }>(
      `INSERT INTO identity.users (email, display_name) VALUES ($1, $2) RETURNING id::text`,
      [`${label}-${randomUUID()}@example.test`, label]
    );
    const id = result.rows[0]?.id;
    if (id === undefined) throw new Error("Failed to create test identity.");
    return id;
  }

  const as = (userId: string) => ({ "x-test-user-id": userId });

  async function access(userId: string) {
    const response = await app.inject({
      method: "GET",
      url: `/v1/me/access/${organizationSlug}`,
      headers: as(userId)
    });
    expect(response.statusCode).toBe(200);
    return catalogAccessSchema.parse(JSON.parse(response.body));
  }

  /** The SQL boundary the provider adapter calls after it verified a webhook. */
  async function applyEvent(
    subscriptionId: string,
    kind: string,
    paymentKey: string | null,
    amountMinor: number | null,
    occurredAt: string
  ): Promise<string> {
    const client = await appPool.connect();
    try {
      const result = await client.query<{ status: string }>(
        `SELECT commerce.apply_subscription_event($1, $2, $3, $4, $5, $6, $7) AS status`,
        [
          organizationId,
          subscriptionId,
          kind,
          paymentKey,
          amountMinor,
          amountMinor === null ? null : "RUB",
          occurredAt
        ]
      );
      return result.rows[0]?.status ?? "";
    } finally {
      client.release();
    }
  }

  async function createPendingSubscription(priceId: string): Promise<string> {
    const result = await migrationPool.query<{ id: string }>(
      `INSERT INTO commerce.subscriptions
         (organization_id, user_id, plan_price_id, amount_minor, currency, billing_period, idempotency_key)
       VALUES ($1, $2, $3, 99000, 'RUB', 'month', $4)
       RETURNING id::text`,
      [organizationId, learnerUserId, priceId, `key-${randomUUID()}`]
    );
    const id = result.rows[0]?.id;
    if (id === undefined) throw new Error("Failed to create subscription.");
    return id;
  }

  beforeAll(async () => {
    ownerUserId = await createUser("subscription-owner");
    learnerUserId = await createUser("subscription-learner");

    app = await createApiApplication();
    app
      .getHttpAdapter()
      .getInstance()
      .addHook("onRequest", async (request) => {
        const testUserId = request.headers["x-test-user-id"];
        if (typeof testUserId === "string" && testUserId.length > 0)
          attachPlatformPrincipal(request as PlatformPrincipalCarrier, {
            userId: testUserId
          });
      });
    await app.init();

    organizationSlug = `subscriptions-${randomUUID().slice(0, 8)}`;
    organizationId = (
      await createTestOrganization(migrationPool, ownerUserId, {
        slug: organizationSlug,
        name: "Subscription integration"
      })
    ).id;
    await migrationPool.query(
      `INSERT INTO organizations.memberships (organization_id, user_id, status, joined_at)
       VALUES ($1, $2, 'active', now())`,
      [organizationId, learnerUserId]
    );
  });

  afterAll(async () => {
    await app.close();
    await appPool.end();
    await migrationPool.end();
  });

  it("lets only commerce managers create plans and immutable prices", async () => {
    const denied = await app.inject({
      method: "POST",
      url: `/v1/organizations/${organizationId}/subscription-plans`,
      headers: as(learnerUserId),
      payload: { slug: "full", name: "Полный доступ" }
    });
    expect(denied.statusCode).toBe(403);

    const plan = await app.inject({
      method: "POST",
      url: `/v1/organizations/${organizationId}/subscription-plans`,
      headers: as(ownerUserId),
      payload: { slug: "full", name: "Полный доступ" }
    });
    expect(plan.statusCode).toBe(201);
    planId = subscriptionPlanSchema.parse(JSON.parse(plan.body)).id;

    const price = await app.inject({
      method: "POST",
      url: `/v1/organizations/${organizationId}/subscription-plans/${planId}/prices`,
      headers: as(ownerUserId),
      payload: { amountMinor: 99000, currency: "RUB", billingPeriod: "month" }
    });
    expect(price.statusCode).toBe(201);
    monthPriceId = subscriptionPlanPriceSchema.parse(JSON.parse(price.body)).id;

    const duplicate = await app.inject({
      method: "POST",
      url: `/v1/organizations/${organizationId}/subscription-plans/${planId}/prices`,
      headers: as(ownerUserId),
      payload: { amountMinor: 79000, currency: "RUB", billingPeriod: "month" }
    });
    expect(duplicate.statusCode).toBe(409);

    const year = await app.inject({
      method: "POST",
      url: `/v1/organizations/${organizationId}/subscription-plans/${planId}/prices`,
      headers: as(ownerUserId),
      payload: { amountMinor: 690000, currency: "RUB", billingPeriod: "year" }
    });
    expect(year.statusCode).toBe(201);

    // The application role cannot rewrite money even in its own tenant.
    await expect(
      appPool.query(
        "UPDATE commerce.subscription_plan_prices SET amount_minor = 1 WHERE id = $1",
        [monthPriceId]
      )
    ).rejects.toThrow(/permission denied/);
  });

  it("gives a new account the trial and an old one no access", async () => {
    const fresh = await access(learnerUserId);
    expect(fresh.access).toBe("trial");
    expect(fresh.until).toBe(fresh.trialEndsAt);

    await migrationPool.query(
      `UPDATE identity.users SET created_at = now() - interval '30 days' WHERE id = $1`,
      [learnerUserId]
    );
    const later = await access(learnerUserId);
    expect(later).toMatchObject({ access: "none", until: null });
  });

  it("opens the catalog for the paid period, once per payment, and closes it on a refund", async () => {
    const subscriptionId = await createPendingSubscription(monthPriceId);
    const paidAt = new Date().toISOString();

    expect(
      await applyEvent(
        subscriptionId,
        "payment_succeeded",
        "c-1",
        99000,
        paidAt
      )
    ).toBe("active");
    const paid = await access(learnerUserId);
    expect(paid.access).toBe("subscription");
    const until = new Date(paid.until ?? "").getTime();
    expect(until).toBeGreaterThan(Date.now() + 29 * 24 * 3600 * 1000);

    // A repeated webhook does not extend the period again.
    expect(
      await applyEvent(
        subscriptionId,
        "payment_succeeded",
        "c-1",
        99000,
        paidAt
      )
    ).toBe("active");
    expect((await access(learnerUserId)).until).toBe(paid.until);

    await expect(
      applyEvent(subscriptionId, "payment_succeeded", "c-2", 100, paidAt)
    ).rejects.toThrow(/does not match/);

    expect(
      await applyEvent(subscriptionId, "payment_failed", null, null, paidAt)
    ).toBe("past_due");
    expect((await access(learnerUserId)).access).toBe("subscription");

    expect(
      await applyEvent(subscriptionId, "cancelled", null, null, paidAt)
    ).toBe("cancelled");
    expect((await access(learnerUserId)).access).toBe("subscription");

    expect(
      await applyEvent(subscriptionId, "revoked", null, null, paidAt)
    ).toBe("revoked");
    expect((await access(learnerUserId)).access).toBe("none");

    const events = await migrationPool.query<{ event_name: string }>(
      `SELECT event_name FROM events.outbox WHERE aggregate_id = $1 ORDER BY occurred_at, id`,
      [subscriptionId]
    );
    expect(events.rows.map((row) => row.event_name)).toEqual([
      "subscription.paid",
      "subscription.past_due",
      "subscription.cancelled",
      "subscription.revoked"
    ]);
  });

  it("refuses a pending subscription with terms other than the price", async () => {
    await expect(
      migrationPool.query(
        `INSERT INTO commerce.subscriptions
           (organization_id, user_id, plan_price_id, amount_minor, currency, billing_period, idempotency_key)
         VALUES ($1, $2, $3, 100, 'RUB', 'month', $4)`,
        [organizationId, learnerUserId, monthPriceId, `key-${randomUUID()}`]
      )
    ).rejects.toThrow(/exact plan price terms/);
  });
});
