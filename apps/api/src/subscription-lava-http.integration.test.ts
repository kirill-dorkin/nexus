import { randomUUID } from "node:crypto";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";

import type { NestFastifyApplication } from "@nestjs/platform-fastify";
import {
  SUBSCRIPTION_TERMS_VERSION,
  ownSubscriptionSchema,
  publicSubscriptionOffersSchema
} from "@platform/contracts";
import { createDatabasePool } from "@platform/database";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createTestOrganization } from "./test-support/create-test-organization";
import { createApiApplication } from "./app.factory";
import {
  attachPlatformPrincipal,
  type PlatformPrincipalCarrier
} from "./request-context/platform-principal";

function env(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} required`);
  return value;
}

type LavaCall = { method: string; url: string; body: unknown; key: string };

/** ADR-0087 slice 3: checkout through lava.top, webhooks applied inline, cancellation. */
describe("subscription checkout with lava.top", () => {
  const migration = createDatabasePool(env("DATABASE_MIGRATION_URL"));
  const origin = "https://learning.example.test";
  const saved = { ...process.env };
  const calls: LavaCall[] = [];
  const firstContractId = randomUUID();
  let lava: Server;
  let app: NestFastifyApplication;
  let owner = "";
  let learner = "";
  let orgId = "";
  let orgSlug = "";
  let priceId = "";
  const secret = `whsec-${randomUUID()}`;

  const as = (userId: string | null) => ({
    origin,
    ...(userId ? { "x-test-user-id": userId } : {})
  });

  const webhook = (body: object, key = secret) =>
    app.inject({
      method: "POST",
      url: "/v1/integrations/payments/lava/webhooks",
      headers: { "x-api-key": key },
      payload: body
    });

  const own = async () => {
    const response = await app.inject({
      method: "GET",
      url: `/v1/me/subscriptions/${orgSlug}`,
      headers: as(learner)
    });
    expect(response.statusCode, response.body).toBe(200);
    return ownSubscriptionSchema.parse(response.json());
  };

  beforeAll(async () => {
    lava = createServer((request, response) => {
      let raw = "";
      request.on("data", (chunk: Buffer) => (raw += chunk.toString()));
      request.on("end", () => {
        calls.push({
          method: request.method ?? "",
          url: request.url ?? "",
          body: raw ? JSON.parse(raw) : null,
          key: String(request.headers["x-api-key"] ?? "")
        });
        if (request.method === "POST" && request.url === "/api/v3/invoice") {
          response.writeHead(201, { "content-type": "application/json" });
          response.end(
            JSON.stringify({
              id: firstContractId,
              status: "in-progress",
              paymentUrl: `https://pay.lava.example/${firstContractId}`
            })
          );
          return;
        }
        response.writeHead(204).end();
      });
    });
    await new Promise<void>((resolve) => lava.listen(0, "127.0.0.1", resolve));
    const port = (lava.address() as AddressInfo).port;
    Object.assign(process.env, {
      WEB_APP_ORIGIN: origin,
      LAVA_API_BASE_URL: `http://127.0.0.1:${port}`,
      LAVA_API_KEY: "lava-author-key",
      LAVA_WEBHOOK_SECRET: secret
    });

    const user = async (name: string) =>
      (
        await migration.query<{ id: string }>(
          "INSERT INTO identity.users(email,display_name) VALUES($1,$2) RETURNING id::text",
          [`${randomUUID()}@example.test`, name]
        )
      ).rows[0]!.id;
    owner = await user("Lava owner");
    learner = await user("Lava learner");

    app = await createApiApplication();
    app
      .getHttpAdapter()
      .getInstance()
      .addHook("onRequest", async (incoming) => {
        const id = incoming.headers["x-test-user-id"];
        if (typeof id === "string" && id)
          attachPlatformPrincipal(incoming as PlatformPrincipalCarrier, {
            userId: id
          });
      });
    await app.init();

    const org = await createTestOrganization(migration, owner, {
      slug: `lava-${randomUUID().slice(0, 8)}`,
      name: "Lava academy"
    });
    orgId = org.id;
    orgSlug = org.slug;
    await migration.query(
      "INSERT INTO organizations.memberships (organization_id,user_id,status,joined_at) VALUES ($1,$2,'active',now())",
      [orgId, learner]
    );
    const plan = await app.inject({
      method: "POST",
      url: `/v1/organizations/${orgId}/subscription-plans`,
      headers: as(owner),
      payload: { slug: "full", name: "Полный доступ" }
    });
    const planId = plan.json<{ id: string }>().id;
    const price = await app.inject({
      method: "POST",
      url: `/v1/organizations/${orgId}/subscription-plans/${planId}/prices`,
      headers: as(owner),
      payload: { amountMinor: 99000, currency: "RUB", billingPeriod: "month" }
    });
    priceId = price.json<{ id: string }>().id;
    process.env.LAVA_OFFERS = JSON.stringify({ [priceId]: randomUUID() });
  });

  afterAll(async () => {
    await app.close();
    await new Promise((resolve) => lava.close(resolve));
    await migration.end();
    for (const name of [
      "WEB_APP_ORIGIN",
      "LAVA_API_BASE_URL",
      "LAVA_API_KEY",
      "LAVA_WEBHOOK_SECRET",
      "LAVA_OFFERS"
    ]) {
      if (saved[name] === undefined) delete process.env[name];
      else process.env[name] = saved[name];
    }
  });

  it("shows the offers to anonymous visitors", async () => {
    const response = await app.inject({
      method: "GET",
      url: `/v1/public/organizations/${orgSlug}/subscription-offers`
    });
    expect(response.statusCode).toBe(200);
    expect(
      publicSubscriptionOffersSchema.parse(response.json()).offers
    ).toEqual([
      {
        priceId,
        planSlug: "full",
        planName: "Полный доступ",
        amountMinor: 99000,
        currency: "RUB",
        billingPeriod: "month"
      }
    ]);
  });

  it("requires the renewal consent and returns one payment page per checkout key", async () => {
    const idempotencyKey = randomUUID();
    const denied = await app.inject({
      method: "POST",
      url: `/v1/me/subscriptions/${orgSlug}/checkout`,
      headers: as(learner),
      payload: {
        priceId,
        idempotencyKey,
        termsVersion: SUBSCRIPTION_TERMS_VERSION
      }
    });
    expect(denied.statusCode).toBe(400);

    const payload = {
      priceId,
      idempotencyKey,
      acceptRenewalTerms: true,
      termsVersion: SUBSCRIPTION_TERMS_VERSION,
      utm: { source: "youtube", medium: "short_video", campaign: "py1" }
    };
    const first = await app.inject({
      method: "POST",
      url: `/v1/me/subscriptions/${orgSlug}/checkout`,
      headers: as(learner),
      payload
    });
    expect(first.statusCode, first.body).toBe(200);
    expect(first.json()).toEqual({
      paymentUrl: `https://pay.lava.example/${firstContractId}`
    });
    const again = await app.inject({
      method: "POST",
      url: `/v1/me/subscriptions/${orgSlug}/checkout`,
      headers: as(learner),
      payload
    });
    expect(again.json()).toEqual(first.json());

    const invoices = calls.filter((call) => call.url === "/api/v3/invoice");
    expect(invoices).toHaveLength(1);
    expect(invoices[0]).toMatchObject({
      key: "lava-author-key",
      body: {
        currency: "RUB",
        periodicity: "MONTHLY",
        clientUtm: { utm_source: "youtube", utm_campaign: "py1" },
        successful_return_url: `${origin}/me/subscription`
      }
    });
    expect((await own()).subscription).toBeNull();
  });

  it("applies authenticated webhooks once and routes renewals and cancellation", async () => {
    expect(
      (await webhook({ eventType: "payment.success" }, "wrong")).statusCode
    ).toBe(401);

    const paid = {
      eventType: "payment.success",
      contractId: firstContractId,
      amount: 990,
      currency: "RUB",
      timestamp: new Date().toISOString(),
      status: "subscription-active"
    };
    expect((await webhook(paid)).json()).toEqual({ outcome: "applied:active" });
    expect((await webhook(paid)).json()).toEqual({ outcome: "duplicate" });
    const active = await own();
    expect(active.subscription?.status).toBe("active");
    expect(active.access.access).toBe("subscription");

    const renewalContract = randomUUID();
    const renewal = await webhook({
      eventType: "subscription.recurring.payment.success",
      contractId: renewalContract,
      parentContractId: firstContractId,
      amount: 990,
      currency: "RUB",
      timestamp: new Date(Date.now() + 1000).toISOString()
    });
    expect(renewal.json()).toEqual({ outcome: "applied:active" });
    const renewed = await own();
    expect(
      new Date(renewed.subscription?.currentPeriodEnd ?? "").getTime()
    ).toBeGreaterThan(
      new Date(active.subscription?.currentPeriodEnd ?? "").getTime()
    );

    const wrongAmount = await webhook({
      eventType: "subscription.recurring.payment.success",
      contractId: randomUUID(),
      parentContractId: firstContractId,
      amount: 1,
      currency: "RUB",
      timestamp: new Date(Date.now() + 2000).toISOString()
    });
    expect(wrongAmount.json()).toEqual({ outcome: "rejected" });

    expect(
      (
        await webhook({
          event_id: randomUUID(),
          event_type: "refund.success",
          data: { amount: 990 }
        })
      ).json()
    ).toEqual({ outcome: "needs_review" });

    const cancelled = await webhook({
      eventType: "subscription.cancelled",
      contractId: renewalContract,
      cancelledAt: new Date().toISOString()
    });
    expect(cancelled.json()).toEqual({ outcome: "applied:cancelled" });
    const after = await own();
    expect(after.subscription?.status).toBe("cancelled");
    expect(after.access.access).toBe("subscription");
  });

  it("cancels at lava.top from «Моя подписка»", async () => {
    // A second learner subscription to cancel through the API.
    await migration.query(
      "UPDATE commerce.subscriptions SET status = 'revoked', revoked_at = now() WHERE organization_id = $1 AND user_id = $2",
      [orgId, learner]
    );
    const contract = randomUUID();
    const sub = await migration.query<{ id: string }>(
      `INSERT INTO commerce.subscriptions
         (organization_id, user_id, plan_price_id, amount_minor, currency, billing_period, idempotency_key)
       VALUES ($1, $2, $3, 99000, 'RUB', 'month', $4) RETURNING id::text`,
      [orgId, learner, priceId, `key-${randomUUID()}`]
    );
    await migration.query(
      "INSERT INTO integrations.lava_contracts (contract_id, organization_id, subscription_id, payment_url) VALUES ($1,$2,$3,'https://pay.lava.example/x')",
      [contract, orgId, sub.rows[0]!.id]
    );
    await webhook({
      eventType: "payment.success",
      contractId: contract,
      amount: 990,
      currency: "RUB",
      timestamp: new Date().toISOString()
    });

    const response = await app.inject({
      method: "POST",
      url: `/v1/me/subscriptions/${orgSlug}/cancel`,
      headers: as(learner)
    });
    expect(response.statusCode, response.body).toBe(200);
    expect(
      ownSubscriptionSchema.parse(response.json()).subscription?.status
    ).toBe("cancelled");
    const deleted = calls.find((call) => call.method === "DELETE");
    expect(deleted?.url).toContain(`contractId=${contract}`);
  });
});
