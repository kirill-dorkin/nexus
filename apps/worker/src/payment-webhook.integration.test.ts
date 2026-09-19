import { createHash, randomUUID } from "node:crypto";

import { createDatabasePool, type DatabasePool } from "@platform/database";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { PaymentWebhookProcessor } from "./payment-webhook.processor.js";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (value === undefined || value.trim().length === 0) {
    throw new Error(`${name} is required for payment webhook processor tests.`);
  }
  return value;
}

type IdRow = { id: string };

describe("payment webhook worker processor", () => {
  let migrationPool: DatabasePool;
  let workerPool: DatabasePool;
  let processor: PaymentWebhookProcessor;

  let userId = "";
  let organizationId = "";
  let courseId = "";
  let courseVersionId = "";
  let offeringId = "";
  let productId = "";
  let priceId = "";

  beforeAll(async () => {
    migrationPool = createDatabasePool(requireEnv("DATABASE_MIGRATION_URL"), {
      applicationName: "payment-webhook-worker-fixtures"
    });
    workerPool = createDatabasePool(requireEnv("DATABASE_WORKER_URL"), {
      applicationName: "payment-webhook-worker-test"
    });
    processor = new PaymentWebhookProcessor(workerPool, {
      leaseSeconds: 30,
      maxAttempts: 3,
      retryBaseMs: 1,
      retryMaxMs: 5
    });

    const user = await migrationPool.query<IdRow>(
      `INSERT INTO identity.users (email, display_name)
       VALUES ($1, $2)
       RETURNING id::text`,
      [`payment-worker-${randomUUID()}@example.test`, "Payment worker learner"]
    );
    userId = user.rows[0]?.id ?? "";
    if (userId.length === 0) throw new Error("Failed to create payment worker user.");

    const organization = await migrationPool.query<IdRow>(
      `INSERT INTO organizations.organizations (slug, name, created_by_user_id)
       VALUES ($1, $2, $3)
       RETURNING id::text`,
      [`payment-worker-${randomUUID()}`, "Payment worker org", userId]
    );
    organizationId = organization.rows[0]?.id ?? "";
    if (organizationId.length === 0) {
      throw new Error("Failed to create payment worker organization.");
    }

    await migrationPool.query(
      `INSERT INTO organizations.memberships (
         organization_id, user_id, status, joined_at
       )
       VALUES ($1, $2, 'active', now())`,
      [organizationId, userId]
    );

    const course = await migrationPool.query<IdRow>(
      `INSERT INTO learning_content.courses (
         organization_id, slug, created_by_user_id
       )
       VALUES ($1, $2, $3)
       RETURNING id::text`,
      [organizationId, `payment-worker-course-${randomUUID()}`, userId]
    );
    courseId = course.rows[0]?.id ?? "";
    if (courseId.length === 0) throw new Error("Failed to create payment worker course.");

    const version = await migrationPool.query<IdRow>(
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
      [organizationId, courseId, "Payment worker course", userId]
    );
    courseVersionId = version.rows[0]?.id ?? "";
    if (courseVersionId.length === 0) {
      throw new Error("Failed to create payment worker course version.");
    }

    const offering = await migrationPool.query<IdRow>(
      `INSERT INTO learning_delivery.learning_offerings (
         organization_id,
         course_version_id,
         slug,
         name,
         delivery_mode,
         access_mode,
         created_by_user_id
       )
       VALUES ($1, $2, $3, $4, 'self_paced', 'entitlement_required', $5)
       RETURNING id::text`,
      [
        organizationId,
        courseVersionId,
        `payment-worker-offering-${randomUUID()}`,
        "Payment worker offering",
        userId
      ]
    );
    offeringId = offering.rows[0]?.id ?? "";
    if (offeringId.length === 0) throw new Error("Failed to create payment worker offering.");

    const product = await migrationPool.query<IdRow>(
      `INSERT INTO commerce.products (
         organization_id,
         offering_id,
         slug,
         name,
         created_by_user_id
       )
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id::text`,
      [
        organizationId,
        offeringId,
        `payment-worker-product-${randomUUID()}`,
        "Payment worker product",
        userId
      ]
    );
    productId = product.rows[0]?.id ?? "";
    if (productId.length === 0) throw new Error("Failed to create payment worker Product.");

    const price = await migrationPool.query<IdRow>(
      `INSERT INTO commerce.prices (
         organization_id,
         product_id,
         amount_minor,
         currency,
         billing_type,
         created_by_user_id
       )
       VALUES ($1, $2, 12900, 'USD', 'one_time', $3)
       RETURNING id::text`,
      [organizationId, productId, userId]
    );
    priceId = price.rows[0]?.id ?? "";
    if (priceId.length === 0) throw new Error("Failed to create payment worker Price.");
  });

  afterAll(async () => {
    if (migrationPool !== undefined && organizationId.length > 0) {
      await migrationPool.query(
        `DELETE FROM integrations.payment_webhook_inbox
         WHERE external_checkout_id LIKE 'cs_worker_%'`
      );
      await migrationPool.query(
        `DELETE FROM integrations.payment_checkouts
         WHERE organization_id = $1`,
        [organizationId]
      );
      await migrationPool.query(
        `DELETE FROM events.outbox WHERE organization_id = $1`,
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
        `DELETE FROM learning_delivery.learning_offerings
         WHERE organization_id = $1`,
        [organizationId]
      );
      await migrationPool.query(
        `DELETE FROM learning_content.course_versions
         WHERE organization_id = $1`,
        [organizationId]
      );
      await migrationPool.query(
        `DELETE FROM learning_content.courses
         WHERE organization_id = $1`,
        [organizationId]
      );
      await migrationPool.query(
        `DELETE FROM organizations.organizations WHERE id = $1`,
        [organizationId]
      );
    }
    if (migrationPool !== undefined && userId.length > 0) {
      await migrationPool.query(`DELETE FROM identity.users WHERE id = $1`, [userId]);
    }
    await Promise.all([migrationPool?.end(), workerPool?.end()]);
  });

  async function createPurchase(): Promise<string> {
    const result = await migrationPool.query<IdRow>(
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
    const id = result.rows[0]?.id;
    if (id === undefined) throw new Error("Failed to create payment worker Purchase.");
    return id;
  }

  async function createCheckout(purchaseId: string, checkoutId: string): Promise<void> {
    await migrationPool.query(
      `INSERT INTO integrations.payment_checkouts (
         organization_id,
         purchase_id,
         provider_key,
         external_checkout_id,
         checkout_url,
         expires_at
       )
       VALUES ($1, $2, 'stripe', $3, $4, now() + interval '30 minutes')`,
      [organizationId, purchaseId, checkoutId, `https://checkout.test/${purchaseId}`]
    );
  }

  async function createInbox(input: Readonly<{
    checkoutId: string;
    amountMinor?: number;
    paymentStatus?: "paid" | "unpaid";
  }>): Promise<string> {
    const eventId = `evt_worker_${randomUUID()}`;
    const payloadHash = createHash("sha256")
      .update(`${eventId}:${input.checkoutId}:${input.amountMinor ?? 12900}`)
      .digest("hex");

    const result = await migrationPool.query<IdRow>(
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
       SELECT
         checkout.organization_id,
         checkout.purchase_id,
         'stripe',
         $1,
         $2,
         'checkout.session.completed',
         $3,
         $4,
         'USD',
         CASE WHEN checkout.purchase_id IS NULL
           THEN 'unmapped_checkout'
           ELSE 'mapped'
         END,
         $5
       FROM (VALUES (1)) AS seed(dummy)
       LEFT JOIN integrations.payment_checkouts AS checkout
         ON checkout.provider_key = 'stripe'
        AND checkout.external_checkout_id = $2
       RETURNING id::text`,
      [
        eventId,
        input.checkoutId,
        input.paymentStatus ?? "paid",
        input.amountMinor ?? 12900,
        payloadHash
      ]
    );
    const id = result.rows[0]?.id;
    if (id === undefined) throw new Error("Failed to create payment worker inbox row.");
    return id;
  }

  it("atomically settles paid Purchase, grants Entitlement, and emits each event once", async () => {
    const purchaseId = await createPurchase();
    const checkoutId = `cs_worker_${randomUUID().replaceAll("-", "")}`;
    await createCheckout(purchaseId, checkoutId);
    const inboxId = await createInbox({ checkoutId });

    await expect(processor.processOne()).resolves.toMatchObject({
      kind: "completed",
      inboxId,
      purchaseId,
      paymentStatus: "paid"
    });

    const purchase = await migrationPool.query<{
      status: string;
      paid_at: Date | null;
    }>(
      `SELECT status, paid_at
       FROM commerce.purchases
       WHERE organization_id = $1 AND id = $2`,
      [organizationId, purchaseId]
    );
    expect(purchase.rows[0]?.status).toBe("paid");
    expect(purchase.rows[0]?.paid_at).toBeInstanceOf(Date);

    const entitlement = await migrationPool.query<{
      status: string;
      grant_source: string;
      source_purchase_id: string | null;
      granted_by_user_id: string | null;
    }>(
      `SELECT
         status,
         grant_source,
         source_purchase_id::text,
         granted_by_user_id::text
       FROM commerce.entitlements
       WHERE organization_id = $1
         AND offering_id = $2
         AND user_id = $3`,
      [organizationId, offeringId, userId]
    );
    expect(entitlement.rows[0]).toEqual({
      status: "active",
      grant_source: "purchase",
      source_purchase_id: purchaseId,
      granted_by_user_id: null
    });

    const events = await migrationPool.query<{ event_name: string }>(
      `SELECT event_name
       FROM events.outbox
       WHERE organization_id = $1
         AND idempotency_key IN ($2, $3)
       ORDER BY event_name`,
      [
        organizationId,
        `purchase-paid:${purchaseId}`,
        `purchase-entitlement-granted:${purchaseId}`
      ]
    );
    expect(events.rows.map((row) => row.event_name)).toEqual([
      "entitlement.granted",
      "purchase.paid"
    ]);

    const enrollment = await migrationPool.query<{ count: string }>(
      `SELECT count(*)::text AS count
       FROM learning_delivery.enrollments
       WHERE organization_id = $1
         AND offering_id = $2
         AND user_id = $3`,
      [organizationId, offeringId, userId]
    );
    expect(enrollment.rows[0]?.count).toBe("0");

    const secondInbox = await createInbox({ checkoutId });
    await expect(processor.processOne()).resolves.toMatchObject({
      kind: "completed",
      inboxId: secondInbox,
      purchaseId
    });

    const eventCount = await migrationPool.query<{ count: string }>(
      `SELECT count(*)::text AS count
       FROM events.outbox
       WHERE organization_id = $1
         AND idempotency_key IN ($2, $3)`,
      [
        organizationId,
        `purchase-paid:${purchaseId}`,
        `purchase-entitlement-granted:${purchaseId}`
      ]
    );
    expect(eventCount.rows[0]?.count).toBe("2");
  });

  it("rejects a paid provider amount that differs from canonical Purchase terms", async () => {
    const purchaseId = await createPurchase();
    const checkoutId = `cs_worker_${randomUUID().replaceAll("-", "")}`;
    await createCheckout(purchaseId, checkoutId);
    const inboxId = await createInbox({ checkoutId, amountMinor: 1 });

    await expect(processor.processOne()).resolves.toEqual({
      kind: "rejected",
      inboxId,
      errorCode: "settlement_mismatch"
    });

    const purchase = await migrationPool.query<{ status: string }>(
      `SELECT status
       FROM commerce.purchases
       WHERE organization_id = $1 AND id = $2`,
      [organizationId, purchaseId]
    );
    expect(purchase.rows[0]?.status).toBe("pending");

    const processing = await migrationPool.query<{
      status: string;
      last_error_code: string | null;
    }>(
      `SELECT status, last_error_code
       FROM integrations.payment_webhook_processing
       WHERE inbox_id = $1`,
      [inboxId]
    );
    expect(processing.rows[0]).toEqual({
      status: "rejected",
      last_error_code: "settlement_mismatch"
    });
  });

  it("completes an unpaid checkout event without changing Purchase or Entitlement", async () => {
    const purchaseId = await createPurchase();
    const checkoutId = `cs_worker_${randomUUID().replaceAll("-", "")}`;
    await createCheckout(purchaseId, checkoutId);
    const inboxId = await createInbox({
      checkoutId,
      paymentStatus: "unpaid"
    });

    await expect(processor.processOne()).resolves.toMatchObject({
      kind: "completed",
      inboxId,
      purchaseId,
      paymentStatus: "unpaid"
    });

    const purchase = await migrationPool.query<{ status: string }>(
      `SELECT status
       FROM commerce.purchases
       WHERE organization_id = $1 AND id = $2`,
      [organizationId, purchaseId]
    );
    expect(purchase.rows[0]?.status).toBe("pending");
  });

  it("avoids a lost wakeup when checkout mapping appears after claim but before blocked finish", async () => {
    const purchaseId = await createPurchase();
    const checkoutId = `cs_worker_${randomUUID().replaceAll("-", "")}`;
    const inboxId = await createInbox({ checkoutId });
    const leaseToken = randomUUID();

    const claimed = await workerPool.query<{ inbox_id: string }>(
      `SELECT inbox_id::text
       FROM platform_internal.claim_payment_webhook($1, 30)`,
      [leaseToken]
    );
    expect(claimed.rows[0]?.inbox_id).toBe(inboxId);

    await createCheckout(purchaseId, checkoutId);

    const finished = await workerPool.query<{ finished: boolean }>(
      `SELECT platform_internal.finish_payment_webhook(
         $1,
         $2,
         'blocked',
         'checkout_mapping_unavailable',
         NULL
       ) AS finished`,
      [inboxId, leaseToken]
    );
    expect(finished.rows[0]?.finished).toBe(true);

    const processing = await migrationPool.query<{
      status: string;
      last_error_code: string | null;
    }>(
      `SELECT status, last_error_code
       FROM integrations.payment_webhook_processing
       WHERE inbox_id = $1`,
      [inboxId]
    );
    expect(processing.rows[0]).toEqual({
      status: "pending",
      last_error_code: null
    });

    await expect(processor.processOne()).resolves.toMatchObject({
      kind: "completed",
      inboxId,
      purchaseId
    });
  });

  it("blocks an unmapped webhook and reactivates it when the trusted checkout mapping appears", async () => {
    const purchaseId = await createPurchase();
    const checkoutId = `cs_worker_${randomUUID().replaceAll("-", "")}`;
    const inboxId = await createInbox({ checkoutId });

    await expect(processor.processOne()).resolves.toEqual({
      kind: "blocked",
      inboxId,
      errorCode: "checkout_mapping_unavailable"
    });

    const blocked = await migrationPool.query<{ status: string }>(
      `SELECT status
       FROM integrations.payment_webhook_processing
       WHERE inbox_id = $1`,
      [inboxId]
    );
    expect(blocked.rows[0]?.status).toBe("blocked");

    await createCheckout(purchaseId, checkoutId);

    const reactivated = await migrationPool.query<{ status: string }>(
      `SELECT status
       FROM integrations.payment_webhook_processing
       WHERE inbox_id = $1`,
      [inboxId]
    );
    expect(reactivated.rows[0]?.status).toBe("pending");

    await expect(processor.processOne()).resolves.toMatchObject({
      kind: "completed",
      inboxId,
      purchaseId
    });
  });
});
