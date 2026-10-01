import { createHmac, randomUUID } from "node:crypto";

import type { NestFastifyApplication } from "@nestjs/platform-fastify";
import {
  commercePriceSchema,
  commerceProductSchema,
  learningOfferingSchema,
  purchaseCheckoutSchema
} from "@platform/contracts";
import { createDatabasePool, type DatabasePool } from "@platform/database";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createApiApplication } from "./app.factory";
import {
  attachPlatformPrincipal,
  type PlatformPrincipalCarrier
} from "./request-context/platform-principal";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (value === undefined || value.trim().length === 0) {
    throw new Error(`${name} is required for purchase integration tests.`);
  }
  return value;
}

type IdRow = { id: string };
type CheckoutRow = {
  organization_id: string;
  purchase_id: string;
  provider_key: string;
  external_checkout_id: string;
  checkout_url: string;
  expires_at: Date | null;
};
type PurchaseRow = {
  status: string;
  amount_minor: number;
  currency: string;
  paid_at: Date | null;
};
type PrivilegeRow = {
  can_update_purchase_amount: boolean;
  can_update_purchase_status: boolean;
  can_delete_purchase: boolean;
  can_delete_checkout: boolean;
  can_read_webhook_inbox: boolean;
};

function paddleId(prefix: "evt" | "txn"): string {
  return `${prefix}_test${randomUUID().replaceAll("-", "").slice(0, 22)}`;
}

describe("Purchase + Paddle transaction settlement vertical", () => {
  const webhookSecret = "test-paddle-webhook-secret-with-sufficient-entropy";
  let previousPaymentProvider: string | undefined;
  let previousWebhookSecret: string | undefined;
  let migrationPool: DatabasePool;
  let app: NestFastifyApplication;

  let ownerUserId = "";
  let learnerAUserId = "";
  let learnerBUserId = "";
  let organizationId = "";
  let courseId = "";
  let courseVersionId = "";
  let offeringId = "";
  let productId = "";
  let priceId = "";
  let alternateProductId = "";
  let alternatePriceId = "";
  let purchaseAId = "";
  let checkoutA: CheckoutRow;
  const purchaseAIdempotencyKey = randomUUID();
  const createdUserIds: string[] = [];

  async function createUser(label: string): Promise<string> {
    const result = await migrationPool.query<IdRow>(
      `INSERT INTO identity.users (email, display_name)
       VALUES ($1, $2)
       RETURNING id::text`,
      [`${label}-${randomUUID()}@example.test`, label]
    );
    const id = result.rows[0]?.id;
    if (id === undefined) {
      throw new Error("Failed to create purchase integration-test identity.");
    }
    createdUserIds.push(id);
    return id;
  }

  async function addLearner(userId: string): Promise<void> {
    const invite = await app.inject({
      method: "POST",
      url: `/v1/organizations/${organizationId}/memberships`,
      headers: { "x-test-user-id": ownerUserId },
      payload: { userId }
    });
    if (invite.statusCode !== 201) {
      throw new Error(`Failed to invite purchase test member: ${invite.body}`);
    }

    const accept = await app.inject({
      method: "POST",
      url: `/v1/organizations/${organizationId}/memberships/me/accept`,
      headers: { "x-test-user-id": userId }
    });
    if (accept.statusCode !== 200) {
      throw new Error(`Failed to activate purchase test member: ${accept.body}`);
    }

    const role = await app.inject({
      method: "POST",
      url: `/v1/organizations/${organizationId}/role-assignments`,
      headers: { "x-test-user-id": ownerUserId },
      payload: {
        userId,
        roleKey: "learner",
        scope: { type: "organization", id: organizationId }
      }
    });
    if (role.statusCode !== 204) {
      throw new Error(`Failed to assign purchase learner role: ${role.body}`);
    }
  }

  async function checkoutByPurchase(purchaseId: string): Promise<CheckoutRow> {
    const result = await migrationPool.query<CheckoutRow>(
      `SELECT
         organization_id::text,
         purchase_id::text,
         provider_key,
         external_checkout_id,
         checkout_url,
         expires_at
       FROM integrations.payment_checkouts
       WHERE organization_id = $1
         AND purchase_id = $2`,
      [organizationId, purchaseId]
    );
    const row = result.rows[0];
    if (row === undefined) {
      throw new Error("Payment checkout mapping was not persisted.");
    }
    return row;
  }

  function paddleEvent(input: Readonly<{
    eventId: string;
    transactionId: string;
    subtotalMinor?: number;
    discountMinor?: number;
    taxMinor?: number;
    currency?: string;
  }>): string {
    const subtotal = input.subtotalMinor ?? 12900;
    const discount = input.discountMinor ?? 0;
    const tax = input.taxMinor ?? 0;
    return JSON.stringify({
      event_id: input.eventId,
      event_type: "transaction.completed",
      occurred_at: new Date().toISOString(),
      data: {
        id: input.transactionId,
        status: "completed",
        collection_mode: "automatic",
        currency_code: input.currency ?? "USD",
        custom_data: {
          // Custom data is deliberately not used for tenant/Purchase routing.
          nexus_purchase_id: randomUUID(),
          nexus_organization_id: randomUUID()
        },
        details: {
          totals: {
            currency_code: input.currency ?? "USD",
            subtotal: String(subtotal),
            discount: String(discount),
            tax: String(tax),
            total: String(subtotal - discount + tax)
          }
        }
      }
    });
  }

  function paddleSignature(rawBody: string, timestamp?: number): string {
    const signedAt = timestamp ?? Math.floor(Date.now() / 1000);
    const digest = createHmac("sha256", webhookSecret)
      .update(`${signedAt}:${rawBody}`)
      .digest("hex");
    return `ts=${signedAt};h1=${digest}`;
  }

  async function sendPaddleWebhook(
    rawBody: string,
    signature = paddleSignature(rawBody)
  ) {
    return app.inject({
      method: "POST",
      url: "/v1/integrations/payments/paddle/webhooks",
      headers: {
        "content-type": "application/json",
        "paddle-signature": signature
      },
      payload: rawBody
    });
  }

  beforeAll(async () => {
    previousPaymentProvider = process.env.PAYMENT_PROVIDER;
    previousWebhookSecret = process.env.PADDLE_WEBHOOK_SECRET;
    process.env.PAYMENT_PROVIDER = "test";
    process.env.PADDLE_WEBHOOK_SECRET = webhookSecret;

    migrationPool = createDatabasePool(requireEnv("DATABASE_MIGRATION_URL"), {
      applicationName: "purchase-payment-integration-fixtures"
    });

    ownerUserId = await createUser("purchase-owner");
    learnerAUserId = await createUser("purchase-learner-a");
    learnerBUserId = await createUser("purchase-learner-b");

    app = await createApiApplication();
    app.getHttpAdapter()
      .getInstance()
      .addHook("onRequest", async (request) => {
        const testUserId = request.headers["x-test-user-id"];
        if (typeof testUserId === "string" && testUserId.length > 0) {
          attachPlatformPrincipal(
            request as PlatformPrincipalCarrier,
            { userId: testUserId }
          );
        }
      });
    await app.init();

    const organization = await app.inject({
      method: "POST",
      url: "/v1/organizations",
      headers: { "x-test-user-id": ownerUserId },
      payload: {
        slug: `purchase-${randomUUID()}`,
        name: "Purchase integration"
      }
    });
    if (organization.statusCode !== 201) {
      throw new Error(`Failed to create purchase test org: ${organization.body}`);
    }
    organizationId = (JSON.parse(organization.body) as { id: string }).id;

    await addLearner(learnerAUserId);
    await addLearner(learnerBUserId);

    const course = await app.inject({
      method: "POST",
      url: `/v1/organizations/${organizationId}/courses`,
      headers: { "x-test-user-id": ownerUserId },
      payload: {
        slug: `purchase-course-${randomUUID()}`,
        title: "Paid course"
      }
    });
    if (course.statusCode !== 201) {
      throw new Error(`Failed to create purchase test course: ${course.body}`);
    }
    const createdCourse = JSON.parse(course.body) as {
      course: { id: string };
      draftVersion: { id: string };
    };
    courseId = createdCourse.course.id;
    courseVersionId = createdCourse.draftVersion.id;

    const publish = await app.inject({
      method: "POST",
      url: `/v1/organizations/${organizationId}/courses/${courseId}/versions/${courseVersionId}/publish`,
      headers: { "x-test-user-id": ownerUserId }
    });
    if (publish.statusCode !== 200) {
      throw new Error(`Failed to publish purchase test course: ${publish.body}`);
    }

    const offering = await app.inject({
      method: "POST",
      url: `/v1/organizations/${organizationId}/offerings`,
      headers: { "x-test-user-id": ownerUserId },
      payload: {
        courseVersionId,
        slug: `paid-${randomUUID()}`,
        name: "Paid offering",
        deliveryMode: "self_paced",
        accessMode: "entitlement_required"
      }
    });
    if (offering.statusCode !== 201) {
      throw new Error(`Failed to create paid offering: ${offering.body}`);
    }
    offeringId = learningOfferingSchema.parse(JSON.parse(offering.body)).id;

    const product = await app.inject({
      method: "POST",
      url: `/v1/organizations/${organizationId}/commerce/products`,
      headers: { "x-test-user-id": ownerUserId },
      payload: {
        offeringId,
        slug: "paid-course",
        name: "Paid Course"
      }
    });
    if (product.statusCode !== 201) {
      throw new Error(`Failed to create paid Product: ${product.body}`);
    }
    productId = commerceProductSchema.parse(JSON.parse(product.body)).id;

    const price = await app.inject({
      method: "POST",
      url: `/v1/organizations/${organizationId}/commerce/products/${productId}/prices`,
      headers: { "x-test-user-id": ownerUserId },
      payload: { amountMinor: 12900, currency: "USD" }
    });
    if (price.statusCode !== 201) {
      throw new Error(`Failed to create paid Price: ${price.body}`);
    }
    priceId = commercePriceSchema.parse(JSON.parse(price.body)).id;

    const alternateProduct = await app.inject({
      method: "POST",
      url: `/v1/organizations/${organizationId}/commerce/products`,
      headers: { "x-test-user-id": ownerUserId },
      payload: {
        offeringId,
        slug: "paid-course-premium",
        name: "Paid Course Premium"
      }
    });
    if (alternateProduct.statusCode !== 201) {
      throw new Error(
        `Failed to create alternate Product: ${alternateProduct.body}`
      );
    }
    alternateProductId = commerceProductSchema.parse(
      JSON.parse(alternateProduct.body)
    ).id;

    const alternatePrice = await app.inject({
      method: "POST",
      url: `/v1/organizations/${organizationId}/commerce/products/${alternateProductId}/prices`,
      headers: { "x-test-user-id": ownerUserId },
      payload: { amountMinor: 19900, currency: "USD" }
    });
    if (alternatePrice.statusCode !== 201) {
      throw new Error(
        `Failed to create alternate Price: ${alternatePrice.body}`
      );
    }
    alternatePriceId = commercePriceSchema.parse(
      JSON.parse(alternatePrice.body)
    ).id;
  });

  afterAll(async () => {
    if (app !== undefined) await app.close();

    if (migrationPool !== undefined && organizationId.length > 0) {
      await migrationPool.query(
        `DELETE FROM integrations.payment_webhook_inbox
          WHERE organization_id = $1
             OR external_checkout_id LIKE 'txn_test%'`,
        [organizationId]
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
        `DELETE FROM learning_delivery.learning_offerings
          WHERE organization_id = $1`,
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

    if (migrationPool !== undefined && createdUserIds.length > 0) {
      await migrationPool.query(
        `DELETE FROM identity.users WHERE id = ANY($1::uuid[])`,
        [createdUserIds]
      );
      await migrationPool.end();
    }

    if (previousPaymentProvider === undefined) {
      delete process.env.PAYMENT_PROVIDER;
    } else {
      process.env.PAYMENT_PROVIDER = previousPaymentProvider;
    }
    if (previousWebhookSecret === undefined) {
      delete process.env.PADDLE_WEBHOOK_SECRET;
    } else {
      process.env.PADDLE_WEBHOOK_SECRET = previousWebhookSecret;
    }
  });

  it("creates one server-priced pending Purchase and one idempotent Paddle checkout", async () => {
    const first = await app.inject({
      method: "POST",
      url: `/v1/organizations/${organizationId}/commerce/purchases`,
      headers: { "x-test-user-id": learnerAUserId },
      payload: { priceId, idempotencyKey: purchaseAIdempotencyKey }
    });
    expect(first.statusCode).toBe(201);
    const created = purchaseCheckoutSchema.parse(JSON.parse(first.body));
    purchaseAId = created.purchase.id;
    expect(created.purchase).toMatchObject({
      organizationId,
      productId,
      priceId,
      offeringId,
      purchaserUserId: learnerAUserId,
      status: "pending",
      amountMinor: 12900,
      currency: "USD",
      billingType: "one_time",
      idempotencyKey: purchaseAIdempotencyKey,
      paidAt: null
    });
    expect(created.checkoutUrl).toBe(`https://checkout.test/${purchaseAId}`);
    expect(created.checkoutExpiresAt).toBeNull();

    const retry = await app.inject({
      method: "POST",
      url: `/v1/organizations/${organizationId}/commerce/purchases`,
      headers: { "x-test-user-id": learnerAUserId },
      payload: { priceId, idempotencyKey: purchaseAIdempotencyKey }
    });
    expect(retry.statusCode).toBe(201);
    const replay = purchaseCheckoutSchema.parse(JSON.parse(retry.body));
    expect(replay.purchase.id).toBe(purchaseAId);
    expect(replay.checkoutUrl).toBe(created.checkoutUrl);
    expect(replay.checkoutExpiresAt).toBeNull();

    const conflict = await app.inject({
      method: "POST",
      url: `/v1/organizations/${organizationId}/commerce/purchases`,
      headers: { "x-test-user-id": learnerAUserId },
      payload: {
        priceId: alternatePriceId,
        idempotencyKey: purchaseAIdempotencyKey
      }
    });
    expect(conflict.statusCode).toBe(409);

    const callerPriced = await app.inject({
      method: "POST",
      url: `/v1/organizations/${organizationId}/commerce/purchases`,
      headers: { "x-test-user-id": learnerAUserId },
      payload: {
        priceId,
        idempotencyKey: randomUUID(),
        amountMinor: 1,
        currency: "USD"
      }
    });
    expect(callerPriced.statusCode).toBe(400);

    checkoutA = await checkoutByPurchase(purchaseAId);
    expect(checkoutA.provider_key).toBe("paddle");
    expect(checkoutA.expires_at).toBeNull();

    const counts = await migrationPool.query<{
      purchases: string;
      checkouts: string;
      created_events: string;
    }>(
      `SELECT
         (SELECT count(*)::text
            FROM commerce.purchases
           WHERE organization_id = $1
             AND purchaser_user_id = $2
             AND client_idempotency_key = $3::uuid) AS purchases,
         (SELECT count(*)::text
            FROM integrations.payment_checkouts
           WHERE organization_id = $1
             AND purchase_id = $4) AS checkouts,
         (SELECT count(*)::text
            FROM events.outbox
           WHERE organization_id = $1
             AND event_name = 'purchase.created'
             AND aggregate_id = $4) AS created_events`,
      [organizationId, learnerAUserId, purchaseAIdempotencyKey, purchaseAId]
    );
    expect(counts.rows[0]).toEqual({
      purchases: "1",
      checkouts: "1",
      created_events: "1"
    });
  });

  it("rejects an invalid Paddle signature before durable inbox acceptance", async () => {
    const eventId = paddleId("evt");
    const rawBody = paddleEvent({
      eventId,
      transactionId: checkoutA.external_checkout_id
    });
    const response = await sendPaddleWebhook(
      rawBody,
      `ts=${Math.floor(Date.now() / 1000)};h1=${"0".repeat(64)}`
    );
    expect(response.statusCode).toBe(401);

    const inbox = await migrationPool.query<{ count: string }>(
      `SELECT count(*)::text AS count
         FROM integrations.payment_webhook_inbox
        WHERE provider_event_id = $1`,
      [eventId]
    );
    expect(inbox.rows[0]?.count).toBe("0");
  });

  it("accepts signed completed transaction durably without synchronously mutating Commerce", async () => {
    const eventId = paddleId("evt");
    const rawBody = paddleEvent({
      eventId,
      transactionId: checkoutA.external_checkout_id,
      taxMinor: 1032
    });
    const first = await sendPaddleWebhook(rawBody);
    expect(first.statusCode).toBe(200);

    const purchase = await migrationPool.query<PurchaseRow>(
      `SELECT status, amount_minor, currency, paid_at
         FROM commerce.purchases
        WHERE organization_id = $1
          AND id = $2`,
      [organizationId, purchaseAId]
    );
    expect(purchase.rows[0]).toEqual({
      status: "pending",
      amount_minor: 12900,
      currency: "USD",
      paid_at: null
    });

    const entitlement = await migrationPool.query<{ count: string }>(
      `SELECT count(*)::text AS count
         FROM commerce.entitlements
        WHERE organization_id = $1
          AND offering_id = $2
          AND user_id = $3`,
      [organizationId, offeringId, learnerAUserId]
    );
    expect(entitlement.rows[0]?.count).toBe("0");

    const inbox = await migrationPool.query<{
      routing_status: string;
      organization_id: string | null;
      purchase_id: string | null;
      payment_status: string;
      amount_minor: number;
      currency: string;
      event_type: string;
      processing_status: string;
    }>(
      `SELECT
         inbox.routing_status,
         inbox.organization_id::text,
         inbox.purchase_id::text,
         inbox.payment_status,
         inbox.amount_minor,
         inbox.currency,
         inbox.event_type,
         processing.status AS processing_status
       FROM integrations.payment_webhook_inbox AS inbox
       JOIN integrations.payment_webhook_processing AS processing
         ON processing.inbox_id = inbox.id
       WHERE inbox.provider_event_id = $1`,
      [eventId]
    );
    expect(inbox.rows[0]).toEqual({
      routing_status: "mapped",
      organization_id: organizationId,
      purchase_id: purchaseAId,
      payment_status: "paid",
      amount_minor: 12900,
      currency: "USD",
      event_type: "transaction.completed",
      processing_status: "pending"
    });

    const duplicate = await sendPaddleWebhook(rawBody);
    expect(duplicate.statusCode).toBe(200);

    const duplicateCount = await migrationPool.query<{ count: string }>(
      `SELECT count(*)::text AS count
         FROM integrations.payment_webhook_inbox
        WHERE provider_event_id = $1`,
      [eventId]
    );
    expect(duplicateCount.rows[0]?.count).toBe("1");

    const changedBody = paddleEvent({
      eventId,
      transactionId: checkoutA.external_checkout_id,
      subtotalMinor: 1
    });
    const conflict = await sendPaddleWebhook(changedBody);
    expect(conflict.statusCode).toBe(409);
  });

  it("normalizes tax outside canonical Price while discounts fail closed against Purchase terms", async () => {
    const eventId = paddleId("evt");
    const discounted = paddleEvent({
      eventId,
      transactionId: checkoutA.external_checkout_id,
      subtotalMinor: 12900,
      discountMinor: 100,
      taxMinor: 1024
    });
    const response = await sendPaddleWebhook(discounted);
    expect(response.statusCode).toBe(200);

    const inbox = await migrationPool.query<{
      amount_minor: number;
      currency: string;
      routing_status: string;
    }>(
      `SELECT amount_minor, currency, routing_status
         FROM integrations.payment_webhook_inbox
        WHERE provider_event_id = $1`,
      [eventId]
    );
    expect(inbox.rows[0]).toEqual({
      amount_minor: 12800,
      currency: "USD",
      routing_status: "mapped"
    });

    const purchase = await migrationPool.query<PurchaseRow>(
      `SELECT status, amount_minor, currency, paid_at
         FROM commerce.purchases
        WHERE organization_id = $1
          AND id = $2`,
      [organizationId, purchaseAId]
    );
    expect(purchase.rows[0]).toMatchObject({
      status: "pending",
      amount_minor: 12900,
      currency: "USD"
    });
  });

  it("refuses a new Purchase when the learner already holds effective access", async () => {
    const grant = await app.inject({
      method: "POST",
      url: `/v1/organizations/${organizationId}/offerings/${offeringId}/entitlements`,
      headers: { "x-test-user-id": ownerUserId },
      payload: { userId: learnerBUserId }
    });
    expect(grant.statusCode).toBe(201);

    const response = await app.inject({
      method: "POST",
      url: `/v1/organizations/${organizationId}/commerce/purchases`,
      headers: { "x-test-user-id": learnerBUserId },
      payload: { priceId, idempotencyKey: randomUUID() }
    });
    expect(response.statusCode).toBe(409);
  });

  it("retains an unmapped signed Paddle webhook for asynchronous route recovery", async () => {
    const eventId = paddleId("evt");
    const unknownTransactionId = paddleId("txn");
    const rawBody = paddleEvent({
      eventId,
      transactionId: unknownTransactionId
    });

    const accepted = await sendPaddleWebhook(rawBody);
    expect(accepted.statusCode).toBe(200);

    const receiveFact = await migrationPool.query<{
      routing_status: string;
      organization_id: string | null;
      purchase_id: string | null;
      processing_status: string;
    }>(
      `SELECT
         inbox.routing_status,
         inbox.organization_id::text,
         inbox.purchase_id::text,
         processing.status AS processing_status
       FROM integrations.payment_webhook_inbox AS inbox
       JOIN integrations.payment_webhook_processing AS processing
         ON processing.inbox_id = inbox.id
       WHERE inbox.provider_event_id = $1`,
      [eventId]
    );
    expect(receiveFact.rows[0]).toEqual({
      routing_status: "unmapped_checkout",
      organization_id: null,
      purchase_id: null,
      processing_status: "pending"
    });
  });

  it("keeps Purchase and payment integration state least-privilege", async () => {
    const privileges = await migrationPool.query<PrivilegeRow>(
      `SELECT
         has_column_privilege(
           'platform_app',
           'commerce.purchases',
           'amount_minor',
           'UPDATE'
         ) AS can_update_purchase_amount,
         has_column_privilege(
           'platform_app',
           'commerce.purchases',
           'status',
           'UPDATE'
         ) AS can_update_purchase_status,
         has_table_privilege(
           'platform_app',
           'commerce.purchases',
           'DELETE'
         ) AS can_delete_purchase,
         has_table_privilege(
           'platform_app',
           'integrations.payment_checkouts',
           'DELETE'
         ) AS can_delete_checkout,
         has_table_privilege(
           'platform_app',
           'integrations.payment_webhook_inbox',
           'SELECT'
         ) AS can_read_webhook_inbox`
    );
    expect(privileges.rows[0]).toEqual({
      can_update_purchase_amount: false,
      can_update_purchase_status: false,
      can_delete_purchase: false,
      can_delete_checkout: false,
      can_read_webhook_inbox: false
    });
  });
});
