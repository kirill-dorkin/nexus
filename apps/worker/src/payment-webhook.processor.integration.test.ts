import { randomUUID } from "node:crypto";

import { createDatabasePool, type DatabasePool } from "@platform/database";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { PaymentWebhookProcessor } from "./payment-webhook.processor.js";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (value === undefined || value.trim().length === 0) {
    throw new Error(`${name} is required for payment worker integration tests.`);
  }
  return value;
}

type IdRow = { id: string };
type Fixture = Readonly<{
  userId: string;
  organizationId: string;
  offeringId: string;
  productId: string;
  priceId: string;
  purchaseId: string;
}>;

describe("payment webhook worker processor", () => {
  let migrationPool: DatabasePool;
  let workerPool: DatabasePool;
  let processor: PaymentWebhookProcessor;
  const organizationIds: string[] = [];
  const userIds: string[] = [];
  const providerEventIds: string[] = [];

  beforeAll(() => {
    migrationPool = createDatabasePool(requireEnv("DATABASE_MIGRATION_URL"), {
      applicationName: "payment-worker-integration-fixtures"
    });
    workerPool = createDatabasePool(requireEnv("DATABASE_WORKER_URL"), {
      applicationName: "payment-worker-integration"
    });
    processor = new PaymentWebhookProcessor(workerPool, {
      leaseSeconds: 30,
      maxAttempts: 3,
      retryBaseMs: 1,
      retryMaxMs: 5
    });
  });

  afterAll(async () => {
    if (providerEventIds.length > 0) {
      await migrationPool.query(
        `DELETE FROM integrations.payment_webhook_inbox
          WHERE provider_event_id = ANY($1::text[])`,
        [providerEventIds]
      );
    }

    for (const organizationId of organizationIds) {
      await migrationPool.query(
        `DELETE FROM integrations.payment_checkouts WHERE organization_id = $1`,
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
        `DELETE FROM learning_content.course_versions WHERE organization_id = $1`,
        [organizationId]
      );
      await migrationPool.query(
        `DELETE FROM learning_content.courses WHERE organization_id = $1`,
        [organizationId]
      );
      await migrationPool.query(
        `DELETE FROM organizations.organizations WHERE id = $1`,
        [organizationId]
      );
    }

    if (userIds.length > 0) {
      await migrationPool.query(
        `DELETE FROM identity.users WHERE id = ANY($1::uuid[])`,
        [userIds]
      );
    }

    await Promise.all([migrationPool.end(), workerPool.end()]);
  });

  async function fixture(label: string): Promise<Fixture> {
    const user = await migrationPool.query<IdRow>(
      `INSERT INTO identity.users (email, display_name)
       VALUES ($1, $2)
       RETURNING id::text`,
      [`payment-worker-${label}-${randomUUID()}@example.test`, `Payment ${label}`]
    );
    const userId = user.rows[0]?.id;
    if (userId === undefined) throw new Error("Failed to create payment test user.");
    userIds.push(userId);

    const organization = await migrationPool.query<IdRow>(
      `INSERT INTO organizations.organizations (slug, name, created_by_user_id)
       VALUES ($1, $2, $3)
       RETURNING id::text`,
      [`pay-${label}-${randomUUID()}`, `Payment ${label}`, userId]
    );
    const organizationId = organization.rows[0]?.id;
    if (organizationId === undefined) {
      throw new Error("Failed to create payment test organization.");
    }
    organizationIds.push(organizationId);

    await migrationPool.query(
      `INSERT INTO organizations.memberships (
         organization_id, user_id, status, joined_at
       ) VALUES ($1, $2, 'active', now())`,
      [organizationId, userId]
    );

    const course = await migrationPool.query<IdRow>(
      `INSERT INTO learning_content.courses (
         organization_id, slug, created_by_user_id
       ) VALUES ($1, $2, $3)
       RETURNING id::text`,
      [organizationId, `course-${label}`, userId]
    );
    const courseId = course.rows[0]?.id;
    if (courseId === undefined) throw new Error("Failed to create payment test course.");

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
       ) VALUES ($1, $2, 1, 'published', $3, $4, $4, now())
       RETURNING id::text`,
      [organizationId, courseId, `Course ${label}`, userId]
    );
    const courseVersionId = version.rows[0]?.id;
    if (courseVersionId === undefined) {
      throw new Error("Failed to create payment test course version.");
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
       ) VALUES ($1, $2, $3, $4, 'self_paced', 'entitlement_required', $5)
       RETURNING id::text`,
      [
        organizationId,
        courseVersionId,
        `offering-${label}`,
        `Offering ${label}`,
        userId
      ]
    );
    const offeringId = offering.rows[0]?.id;
    if (offeringId === undefined) throw new Error("Failed to create payment test offering.");

    const product = await migrationPool.query<IdRow>(
      `INSERT INTO commerce.products (
         organization_id,
         offering_id,
         slug,
         name,
         created_by_user_id
       ) VALUES ($1, $2, $3, $4, $5)
       RETURNING id::text`,
      [
        organizationId,
        offeringId,
        `product-${label}`,
        `Product ${label}`,
        userId
      ]
    );
    const productId = product.rows[0]?.id;
    if (productId === undefined) throw new Error("Failed to create payment test Product.");

    const price = await migrationPool.query<IdRow>(
      `INSERT INTO commerce.prices (
         organization_id,
         product_id,
         amount_minor,
         currency,
         billing_type,
         created_by_user_id
       ) VALUES ($1, $2, 12900, 'USD', 'one_time', $3)
       RETURNING id::text`,
      [organizationId, productId, userId]
    );
    const priceId = price.rows[0]?.id;
    if (priceId === undefined) throw new Error("Failed to create payment test Price.");

    const purchase = await migrationPool.query<IdRow>(
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
       ) VALUES ($1, $2, $3, $4, $5, 12900, 'USD', 'one_time', $6)
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
    const purchaseId = purchase.rows[0]?.id;
    if (purchaseId === undefined) throw new Error("Failed to create payment test Purchase.");

    return {
      userId,
      organizationId,
      offeringId,
      productId,
      priceId,
      purchaseId
    };
  }

  async function mapCheckout(
    fixture: Fixture,
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
       ) VALUES ($1, $2, 'stripe', $3, $4, now() + interval '30 minutes')`,
      [
        fixture.organizationId,
        fixture.purchaseId,
        externalCheckoutId,
        `https://checkout.test/${fixture.purchaseId}`
      ]
    );
  }

  async function inbox(input: Readonly<{
    externalCheckoutId: string;
    amountMinor?: number;
    paymentStatus?: "paid" | "unpaid";
  }>): Promise<string> {
    const providerEventId = `evt_test_${randomUUID()}`;
    providerEventIds.push(providerEventId);
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
         CASE
           WHEN checkout.purchase_id IS NULL THEN 'unmapped_checkout'
           ELSE 'mapped'
         END,
         repeat('a', 64)
       FROM (SELECT 1) AS seed
       LEFT JOIN integrations.payment_checkouts AS checkout
         ON checkout.provider_key = 'stripe'
        AND checkout.external_checkout_id = $2
       RETURNING id::text`,
      [
        providerEventId,
        input.externalCheckoutId,
        input.paymentStatus ?? "paid",
        input.amountMinor ?? 12900
      ]
    );
    const inboxId = result.rows[0]?.id;
    if (inboxId === undefined) throw new Error("Failed to create payment webhook inbox row.");
    return inboxId;
  }

  it("settles paid Purchase + Entitlement atomically and idempotently", async () => {
    const fx = await fixture("paid");
    const checkoutId = `cs_test_${randomUUID().replaceAll("-", "")}`;
    await mapCheckout(fx, checkoutId);
    await inbox({ externalCheckoutId: checkoutId });

    await expect(processor.processOne()).resolves.toMatchObject({
      kind: "completed",
      purchaseId: fx.purchaseId,
      paymentStatus: "paid"
    });

    const purchase = await migrationPool.query<{
      status: string;
      paid_at: Date | null;
    }>(
      `SELECT status, paid_at
         FROM commerce.purchases
        WHERE organization_id = $1 AND id = $2`,
      [fx.organizationId, fx.purchaseId]
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
      [fx.organizationId, fx.offeringId, fx.userId]
    );
    expect(entitlement.rows[0]).toEqual({
      status: "active",
      grant_source: "purchase",
      source_purchase_id: fx.purchaseId,
      granted_by_user_id: null
    });

    const enrollment = await migrationPool.query<{ count: string }>(
      `SELECT count(*)::text AS count
         FROM learning_delivery.enrollments
        WHERE organization_id = $1
          AND offering_id = $2
          AND user_id = $3`,
      [fx.organizationId, fx.offeringId, fx.userId]
    );
    expect(enrollment.rows[0]?.count).toBe("0");

    await inbox({
      externalCheckoutId: checkoutId,
      paymentStatus: "paid"
    });
    await expect(processor.processOne()).resolves.toMatchObject({
      kind: "completed",
      purchaseId: fx.purchaseId
    });

    const events = await migrationPool.query<{
      event_name: string;
      count: string;
    }>(
      `SELECT event_name, count(*)::text AS count
         FROM events.outbox
        WHERE organization_id = $1
          AND event_name IN ('purchase.paid', 'entitlement.granted')
          AND (
            aggregate_id = $2
            OR payload ->> 'sourcePurchaseId' = $2
          )
        GROUP BY event_name
        ORDER BY event_name`,
      [fx.organizationId, fx.purchaseId]
    );
    expect(events.rows).toEqual([
      { event_name: "entitlement.granted", count: "1" },
      { event_name: "purchase.paid", count: "1" }
    ]);
  });

  it("rejects settlement amount mismatch without changing canonical state", async () => {
    const fx = await fixture("mismatch");
    const checkoutId = `cs_test_${randomUUID().replaceAll("-", "")}`;
    await mapCheckout(fx, checkoutId);
    const inboxId = await inbox({
      externalCheckoutId: checkoutId,
      amountMinor: 1
    });

    await expect(processor.processOne()).resolves.toMatchObject({
      kind: "rejected",
      inboxId,
      errorCode: "settlement_mismatch"
    });

    const purchase = await migrationPool.query<{ status: string }>(
      `SELECT status
         FROM commerce.purchases
        WHERE organization_id = $1 AND id = $2`,
      [fx.organizationId, fx.purchaseId]
    );
    expect(purchase.rows[0]?.status).toBe("pending");

    const entitlement = await migrationPool.query<{ count: string }>(
      `SELECT count(*)::text AS count
         FROM commerce.entitlements
        WHERE organization_id = $1
          AND offering_id = $2
          AND user_id = $3`,
      [fx.organizationId, fx.offeringId, fx.userId]
    );
    expect(entitlement.rows[0]?.count).toBe("0");
  });

  it("completes unpaid delivery without granting access", async () => {
    const fx = await fixture("unpaid");
    const checkoutId = `cs_test_${randomUUID().replaceAll("-", "")}`;
    await mapCheckout(fx, checkoutId);
    await inbox({
      externalCheckoutId: checkoutId,
      paymentStatus: "unpaid"
    });

    await expect(processor.processOne()).resolves.toMatchObject({
      kind: "completed",
      purchaseId: fx.purchaseId,
      paymentStatus: "unpaid"
    });

    const purchase = await migrationPool.query<{ status: string }>(
      `SELECT status
         FROM commerce.purchases
        WHERE organization_id = $1 AND id = $2`,
      [fx.organizationId, fx.purchaseId]
    );
    expect(purchase.rows[0]?.status).toBe("pending");
  });

  it("blocks unmapped delivery and reactivates it when trusted mapping appears", async () => {
    const fx = await fixture("mapping-race");
    const checkoutId = `cs_test_${randomUUID().replaceAll("-", "")}`;
    const inboxId = await inbox({ externalCheckoutId: checkoutId });

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

    await mapCheckout(fx, checkoutId);

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
      purchaseId: fx.purchaseId
    });

    const receiveFact = await migrationPool.query<{
      routing_status: string;
      organization_id: string | null;
      purchase_id: string | null;
    }>(
      `SELECT routing_status, organization_id::text, purchase_id::text
         FROM integrations.payment_webhook_inbox
        WHERE id = $1`,
      [inboxId]
    );
    expect(receiveFact.rows[0]).toEqual({
      routing_status: "unmapped_checkout",
      organization_id: null,
      purchase_id: null
    });

    const purchase = await migrationPool.query<{ status: string }>(
      `SELECT status
         FROM commerce.purchases
        WHERE organization_id = $1 AND id = $2`,
      [fx.organizationId, fx.purchaseId]
    );
    expect(purchase.rows[0]?.status).toBe("paid");
  });

  it("does not grant platform_worker direct Commerce write privileges", async () => {
    const privileges = await migrationPool.query<{
      update_purchase: boolean;
      insert_entitlement: boolean;
      insert_outbox: boolean;
    }>(
      `SELECT
         has_table_privilege(
           'platform_worker',
           'commerce.purchases',
           'UPDATE'
         ) AS update_purchase,
         has_table_privilege(
           'platform_worker',
           'commerce.entitlements',
           'INSERT'
         ) AS insert_entitlement,
         has_table_privilege(
           'platform_worker',
           'events.outbox',
           'INSERT'
         ) AS insert_outbox`
    );
    expect(privileges.rows[0]).toEqual({
      update_purchase: false,
      insert_entitlement: false,
      insert_outbox: false
    });
  });
});
