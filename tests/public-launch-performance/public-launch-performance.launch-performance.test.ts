import {
  createHash,
  createHmac,
  randomUUID
} from "node:crypto";
import { performance } from "node:perf_hooks";

import type { NestFastifyApplication } from "@nestjs/platform-fastify";
import {
  createDatabasePool,
  type DatabasePool
} from "@platform/database";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createApiApplication } from "../../apps/api/src/app.factory";
import {
  attachPlatformPrincipal,
  type PlatformPrincipalCarrier
} from "../../apps/api/src/request-context/platform-principal";
import { PaymentWebhookProcessor } from "../../apps/worker/src/payment-webhook.processor.js";

const WEB_ORIGIN = "https://web.example.test";
const PADDLE_WEBHOOK_SECRET =
  "launch-performance-paddle-webhook-secret-with-sufficient-entropy";
const WARMUP_SAMPLES = 3;
const MEASURED_SAMPLES = 20;

const BUDGETS_MS = {
  catalog_list: 500,
  catalog_detail: 500,
  customer_entry: 750,
  checkout: 3_000,
  paddle_webhook: 500,
  purchaser_reconciliation: 750,
  payment_worker: 1_000
} as const;

type Boundary = keyof typeof BUDGETS_MS;
type IdRow = { id: string };
type CheckoutResponse = Readonly<{ purchase: Readonly<{ id: string }> }>;

type PerformanceEvidence = Readonly<{
  boundary: Boundary;
  budgetMs: number;
  sampleCount: number;
  p50Ms: number;
  p95Ms: number;
  maxMs: number;
  errorCount: number;
  firstError: string | null;
}>;

function requireEnv(name: string): string {
  const value = process.env[name];
  if (value === undefined || value.trim().length === 0) {
    throw new Error(`${name} is required for public launch performance verification.`);
  }
  return value;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function percentile(samples: readonly number[], quantile: number): number {
  if (samples.length === 0) return 0;
  const sorted = [...samples].sort((left, right) => left - right);
  const index = Math.max(0, Math.ceil(quantile * sorted.length) - 1);
  return sorted[index] ?? 0;
}

function rounded(value: number): number {
  return Math.round(value * 100) / 100;
}

async function measureBoundary(
  boundary: Boundary,
  action: (sampleIndex: number) => Promise<void>
): Promise<PerformanceEvidence> {
  for (let index = 0; index < WARMUP_SAMPLES; index += 1) {
    await action(index);
  }

  const durations: number[] = [];
  let errorCount = 0;
  let firstError: string | null = null;

  for (let index = 0; index < MEASURED_SAMPLES; index += 1) {
    const startedAt = performance.now();
    try {
      await action(WARMUP_SAMPLES + index);
    } catch (error) {
      errorCount += 1;
      firstError ??= errorMessage(error);
    } finally {
      durations.push(performance.now() - startedAt);
    }
  }

  return {
    boundary,
    budgetMs: BUDGETS_MS[boundary],
    sampleCount: durations.length,
    p50Ms: rounded(percentile(durations, 0.5)),
    p95Ms: rounded(percentile(durations, 0.95)),
    maxMs: rounded(Math.max(...durations)),
    errorCount,
    firstError
  };
}

describe("bounded public launch performance verification", () => {
  const previousPaymentProvider = process.env.PAYMENT_PROVIDER;
  const previousWebOrigin = process.env.WEB_APP_ORIGIN;
  const previousPaddleWebhookSecret = process.env.PADDLE_WEBHOOK_SECRET;

  let migrationPool: DatabasePool;
  let workerPool: DatabasePool;
  let processor: PaymentWebhookProcessor;
  let app: NestFastifyApplication;

  let ownerUserId = "";
  let buyerUserId = "";
  let organizationId = "";
  let courseId = "";
  let courseVersionId = "";
  let offeringId = "";
  let productId = "";
  let priceId = "";
  let paddleIngressPurchaseId = "";
  let paddleIngressCheckoutId = "";

  const organizationSlug = `launch-performance-${randomUUID()}`;
  const productSlug = `launch-product-${randomUUID()}`;
  const ingressEventPrefix = `evt_perf_ingress_${randomUUID().replaceAll("-", "")}_`;
  const workerEventPrefix = `evt_perf_worker_${randomUUID().replaceAll("-", "")}_`;
  const createdUserIds: string[] = [];
  const customerEntryUserIds: string[] = [];

  async function insertId(
    sql: string,
    values: readonly unknown[]
  ): Promise<string> {
    const result = await migrationPool.query<IdRow>(sql, [...values]);
    const id = result.rows[0]?.id;
    if (id === undefined) {
      throw new Error("Launch performance fixture insert did not return an id.");
    }
    return id;
  }

  async function createUser(label: string): Promise<string> {
    const userId = await insertId(
      `INSERT INTO identity.users (email, display_name)
       VALUES ($1, $2)
       RETURNING id::text`,
      [`${label}-${randomUUID()}@example.test`, label]
    );
    createdUserIds.push(userId);
    return userId;
  }

  function principalHeaders(userId: string, includeOrigin = false) {
    return includeOrigin
      ? { "x-test-user-id": userId, origin: WEB_ORIGIN }
      : { "x-test-user-id": userId };
  }

  async function createPurchase(userId: string): Promise<string> {
    return insertId(
      `INSERT INTO commerce.purchases (
         organization_id,
         product_id,
         price_id,
         offering_id,
         purchaser_user_id,
         amount_minor,
         currency,
         billing_type,
         client_idempotency_key
       )
       VALUES ($1, $2, $3, $4, $5, 12900, 'USD', 'one_time', $6)
       RETURNING id::text`,
      [
        organizationId,
        productId,
        priceId,
        offeringId,
        userId,
        randomUUID()
      ]
    );
  }

  async function createPaddleCheckout(
    purchaseId: string,
    externalCheckoutId: string
  ): Promise<void> {
    await migrationPool.query(
      `INSERT INTO integrations.payment_checkouts (
         organization_id,
         purchase_id,
         provider_key,
         external_checkout_id,
         checkout_url,
         expires_at
       )
       VALUES ($1, $2, 'paddle', $3, $4, NULL)`,
      [
        organizationId,
        purchaseId,
        externalCheckoutId,
        `https://pay.paddle.test/${purchaseId}`
      ]
    );
  }

  async function createWorkerInbox(
    purchaseId: string,
    externalCheckoutId: string,
    sampleIndex: number
  ): Promise<void> {
    const eventId = `${workerEventPrefix}${sampleIndex}`;
    const payloadHash = createHash("sha256")
      .update(`${eventId}:${externalCheckoutId}:12900`)
      .digest("hex");

    await migrationPool.query(
      `INSERT INTO integrations.payment_webhook_inbox (
         organization_id,
         purchase_id,
         provider_key,
         provider_event_id,
         external_checkout_id,
         event_type,
         payment_status,
         amount_minor,
         currency,
         routing_status,
         payload_sha256
       )
       VALUES (
         $1, $2, 'paddle', $3, $4, 'transaction.completed', 'paid',
         12900, 'USD', 'mapped', $5
       )`,
      [organizationId, purchaseId, eventId, externalCheckoutId, payloadHash]
    );
  }

  function paddleWebhookBody(eventId: string): Buffer {
    return Buffer.from(
      JSON.stringify({
        event_id: eventId,
        event_type: "transaction.completed",
        data: {
          id: paddleIngressCheckoutId,
          status: "completed",
          collection_mode: "automatic",
          currency_code: "USD",
          details: {
            totals: {
              currency_code: "USD",
              subtotal: "12900",
              discount: "0",
              tax: "0",
              total: "12900"
            }
          }
        }
      })
    );
  }

  function paddleSignature(rawBody: Buffer): string {
    const timestamp = Math.floor(Date.now() / 1000);
    const signature = createHmac("sha256", PADDLE_WEBHOOK_SECRET)
      .update(`${timestamp}:`)
      .update(rawBody)
      .digest("hex");
    return `ts=${timestamp};h1=${signature}`;
  }

  beforeAll(async () => {
    process.env.PAYMENT_PROVIDER = "test";
    process.env.WEB_APP_ORIGIN = WEB_ORIGIN;
    process.env.PADDLE_WEBHOOK_SECRET = PADDLE_WEBHOOK_SECRET;

    migrationPool = createDatabasePool(requireEnv("DATABASE_MIGRATION_URL"), {
      applicationName: "public-launch-performance-fixtures"
    });
    workerPool = createDatabasePool(requireEnv("DATABASE_WORKER_URL"), {
      applicationName: "public-launch-performance-worker"
    });
    processor = new PaymentWebhookProcessor(workerPool, {
      leaseSeconds: 30,
      maxAttempts: 3,
      retryBaseMs: 1,
      retryMaxMs: 5
    });

    ownerUserId = await createUser("launch-performance-owner");
    buyerUserId = await createUser("launch-performance-buyer");

    organizationId = await insertId(
      `INSERT INTO organizations.organizations (
         slug,
         name,
         customer_entry_policy,
         created_by_user_id
       )
       VALUES ($1, $2, 'open', $3)
       RETURNING id::text`,
      [organizationSlug, "Launch performance organization", ownerUserId]
    );

    await migrationPool.query(
      `INSERT INTO organizations.memberships (
         organization_id, user_id, status, joined_at
       )
       VALUES ($1, $2, 'active', now())`,
      [organizationId, buyerUserId]
    );

    courseId = await insertId(
      `INSERT INTO learning_content.courses (
         organization_id, slug, created_by_user_id
       )
       VALUES ($1, $2, $3)
       RETURNING id::text`,
      [organizationId, `launch-course-${randomUUID()}`, ownerUserId]
    );

    courseVersionId = await insertId(
      `INSERT INTO learning_content.course_versions (
         organization_id,
         course_id,
         version_number,
         status,
         title,
         created_by_user_id,
         published_by_user_id,
         published_at
       )
       VALUES ($1, $2, 1, 'published', $3, $4, $4, now())
       RETURNING id::text`,
      [organizationId, courseId, "Launch performance course", ownerUserId]
    );

    offeringId = await insertId(
      `INSERT INTO learning_delivery.learning_offerings (
         organization_id,
         course_version_id,
         slug,
         name,
         delivery_mode,
         access_mode,
         status,
         created_by_user_id
       )
       VALUES ($1, $2, $3, $4, 'self_paced', 'entitlement_required', 'open', $5)
       RETURNING id::text`,
      [
        organizationId,
        courseVersionId,
        `launch-offering-${randomUUID()}`,
        "Launch performance offering",
        ownerUserId
      ]
    );

    productId = await insertId(
      `INSERT INTO commerce.products (
         organization_id,
         offering_id,
         slug,
         name,
         status,
         created_by_user_id
       )
       VALUES ($1, $2, $3, $4, 'active', $5)
       RETURNING id::text`,
      [
        organizationId,
        offeringId,
        productSlug,
        "Launch performance product",
        ownerUserId
      ]
    );

    priceId = await insertId(
      `INSERT INTO commerce.prices (
         organization_id,
         product_id,
         amount_minor,
         currency,
         billing_type,
         status,
         created_by_user_id
       )
       VALUES ($1, $2, 12900, 'USD', 'one_time', 'active', $3)
       RETURNING id::text`,
      [organizationId, productId, ownerUserId]
    );

    for (let index = 0; index < WARMUP_SAMPLES + MEASURED_SAMPLES; index += 1) {
      customerEntryUserIds.push(await createUser(`launch-entry-${index}`));
    }

    paddleIngressPurchaseId = await createPurchase(buyerUserId);
    paddleIngressCheckoutId = `txn_perf_ingress_${randomUUID().replaceAll("-", "")}`;
    await createPaddleCheckout(paddleIngressPurchaseId, paddleIngressCheckoutId);

    for (let index = 0; index < WARMUP_SAMPLES + MEASURED_SAMPLES; index += 1) {
      const workerUserId = await createUser(`launch-worker-${index}`);
      const purchaseId = await createPurchase(workerUserId);
      const checkoutId = `txn_perf_worker_${randomUUID().replaceAll("-", "")}`;
      await createPaddleCheckout(purchaseId, checkoutId);
      await createWorkerInbox(purchaseId, checkoutId, index);
    }

    app = await createApiApplication();
    app.getHttpAdapter()
      .getInstance()
      .addHook("onRequest", async (request) => {
        const testUserId = request.headers["x-test-user-id"];
        if (typeof testUserId === "string" && testUserId.length > 0) {
          attachPlatformPrincipal(request as PlatformPrincipalCarrier, {
            userId: testUserId
          });
        }
      });
    await app.init();
  });

  afterAll(async () => {
    if (app !== undefined) await app.close();

    if (migrationPool !== undefined && organizationId.length > 0) {
      await migrationPool.query(
        `DELETE FROM integrations.payment_webhook_inbox
          WHERE organization_id = $1
             OR provider_event_id LIKE $2
             OR provider_event_id LIKE $3`,
        [organizationId, `${ingressEventPrefix}%`, `${workerEventPrefix}%`]
      );
      await migrationPool.query(
        `DELETE FROM integrations.payment_checkouts WHERE organization_id = $1`,
        [organizationId]
      );
      await migrationPool.query(
        `DELETE FROM events.outbox WHERE organization_id = $1`,
        [organizationId]
      );
      await migrationPool.query(
        `DELETE FROM learning_delivery.enrollments WHERE organization_id = $1`,
        [organizationId]
      );
      await migrationPool.query(
        `DELETE FROM commerce.entitlements WHERE organization_id = $1`,
        [organizationId]
      );
      await migrationPool.query(
        `DELETE FROM commerce.purchases WHERE organization_id = $1`,
        [organizationId]
      );
      await migrationPool.query(
        `DELETE FROM commerce.prices WHERE organization_id = $1`,
        [organizationId]
      );
      await migrationPool.query(
        `DELETE FROM commerce.products WHERE organization_id = $1`,
        [organizationId]
      );
      await migrationPool.query(
        `DELETE FROM learning_delivery.learning_offerings WHERE organization_id = $1`,
        [organizationId]
      );
      await migrationPool.query(
        `DELETE FROM learning_content.course_versions WHERE organization_id = $1`,
        [organizationId]
      );
      await migrationPool.query(
        `DELETE FROM learning_content.courses WHERE organization_id = $1`,
        [organizationId]
      );
      await migrationPool.query(
        `DELETE FROM organizations.memberships WHERE organization_id = $1`,
        [organizationId]
      );
      await migrationPool.query(
        `DELETE FROM organizations.organizations WHERE id = $1`,
        [organizationId]
      );
    }

    if (migrationPool !== undefined && createdUserIds.length > 0) {
      await migrationPool.query(
        `DELETE FROM identity.users WHERE id = ANY($1::uuid[])`,
        [createdUserIds]
      );
    }

    await Promise.all([migrationPool?.end(), workerPool?.end()]);

    if (previousPaymentProvider === undefined) delete process.env.PAYMENT_PROVIDER;
    else process.env.PAYMENT_PROVIDER = previousPaymentProvider;
    if (previousWebOrigin === undefined) delete process.env.WEB_APP_ORIGIN;
    else process.env.WEB_APP_ORIGIN = previousWebOrigin;
    if (previousPaddleWebhookSecret === undefined) {
      delete process.env.PADDLE_WEBHOOK_SECRET;
    } else {
      process.env.PADDLE_WEBHOOK_SECRET = previousPaddleWebhookSecret;
    }
  });

  it("keeps deterministic warm launch-path p95 inside the rollout acceptance budgets", async () => {
    const evidence: PerformanceEvidence[] = [];

    evidence.push(
      await measureBoundary("catalog_list", async () => {
        const response = await app.inject({
          method: "GET",
          url: `/v1/public/catalog/${organizationSlug}/products`
        });
        if (response.statusCode !== 200) {
          throw new Error(`catalog list returned ${response.statusCode}: ${response.body}`);
        }
      })
    );

    evidence.push(
      await measureBoundary("catalog_detail", async () => {
        const response = await app.inject({
          method: "GET",
          url: `/v1/public/catalog/${organizationSlug}/products/${productSlug}`
        });
        if (response.statusCode !== 200) {
          throw new Error(
            `catalog detail returned ${response.statusCode}: ${response.body}`
          );
        }
      })
    );

    evidence.push(
      await measureBoundary("customer_entry", async (sampleIndex) => {
        const userId = customerEntryUserIds[sampleIndex];
        if (userId === undefined) {
          throw new Error(`missing customer-entry user for sample ${sampleIndex}`);
        }
        const response = await app.inject({
          method: "POST",
          url: `/v1/public/organizations/${organizationSlug}/memberships/me`,
          headers: principalHeaders(userId, true)
        });
        if (response.statusCode !== 200) {
          throw new Error(
            `customer entry returned ${response.statusCode}: ${response.body}`
          );
        }
      })
    );

    const checkoutPurchaseIds: string[] = [];
    evidence.push(
      await measureBoundary("checkout", async () => {
        const response = await app.inject({
          method: "POST",
          url: `/v1/public/catalog/${organizationSlug}/products/${productSlug}/checkout`,
          headers: principalHeaders(buyerUserId, true),
          payload: {
            priceId,
            idempotencyKey: randomUUID()
          }
        });
        if (response.statusCode !== 201) {
          throw new Error(`checkout returned ${response.statusCode}: ${response.body}`);
        }
        const body = JSON.parse(response.body) as CheckoutResponse;
        if (typeof body.purchase?.id !== "string") {
          throw new Error("checkout response did not expose a Purchase locator");
        }
        checkoutPurchaseIds.push(body.purchase.id);
      })
    );

    const reconciliationPurchaseId = checkoutPurchaseIds.at(-1);
    if (reconciliationPurchaseId === undefined) {
      throw new Error("checkout verification produced no Purchase for reconciliation");
    }

    evidence.push(
      await measureBoundary("purchaser_reconciliation", async () => {
        const response = await app.inject({
          method: "GET",
          url: `/v1/me/purchases/${reconciliationPurchaseId}`,
          headers: principalHeaders(buyerUserId)
        });
        if (response.statusCode !== 200) {
          throw new Error(
            `purchaser reconciliation returned ${response.statusCode}: ${response.body}`
          );
        }
      })
    );

    evidence.push(
      await measureBoundary("paddle_webhook", async (sampleIndex) => {
        const rawBody = paddleWebhookBody(`${ingressEventPrefix}${sampleIndex}`);
        const response = await app.inject({
          method: "POST",
          url: "/integrations/payments/paddle/webhooks",
          headers: {
            "content-type": "application/json",
            "paddle-signature": paddleSignature(rawBody)
          },
          payload: rawBody
        });
        if (response.statusCode !== 200) {
          throw new Error(
            `Paddle webhook ingress returned ${response.statusCode}: ${response.body}`
          );
        }
      })
    );

    await migrationPool.query(
      `DELETE FROM integrations.payment_webhook_inbox
        WHERE provider_event_id LIKE $1`,
      [`${ingressEventPrefix}%`]
    );

    evidence.push(
      await measureBoundary("payment_worker", async () => {
        const cycle = await processor.processOne();
        if (cycle.kind !== "completed") {
          throw new Error(`payment worker returned ${cycle.kind}`);
        }
      })
    );

    const report = {
      verification: "bounded_warm_ci_guardrail",
      warmupSamples: WARMUP_SAMPLES,
      measuredSamples: MEASURED_SAMPLES,
      capacityClaim: false,
      evidence
    };
    console.log(`PUBLIC_LAUNCH_PERFORMANCE_EVIDENCE=${JSON.stringify(report)}`);

    const violations = evidence.filter(
      (measurement) =>
        measurement.errorCount > 0 || measurement.p95Ms > measurement.budgetMs
    );
    expect(violations, JSON.stringify(report, null, 2)).toEqual([]);
  });
});
