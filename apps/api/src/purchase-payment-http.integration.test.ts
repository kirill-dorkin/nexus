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
  external_checkout_id: string;
  checkout_url: string;
  expires_at: Date;
};
type PurchaseRow = {
  status: string;
  amount_minor: number;
  currency: string;
  paid_at: Date | null;
};
type EntitlementRow = {
  status: string;
  grant_source: string;
  source_purchase_id: string | null;
  granted_by_user_id: string | null;
};
type PrivilegeRow = {
  can_update_purchase_amount: boolean;
  can_update_purchase_status: boolean;
  can_delete_purchase: boolean;
  can_delete_checkout: boolean;
  can_read_webhook_inbox: boolean;
};

describe("Purchase + Stripe Checkout settlement vertical", () => {
  const webhookSecret = "test-stripe-webhook-secret-with-sufficient-entropy";
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
  let purchaseBId = "";
  let checkoutA: CheckoutRow;
  let checkoutB: CheckoutRow;
  const purchaseAIdempotencyKey = randomUUID();
  const purchaseBIdempotencyKey = randomUUID();
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

  function stripeEvent(input: {
    eventId: string;
    checkoutId: string;
    type?:
      | "checkout.session.completed"
      | "checkout.session.async_payment_succeeded";
    paymentStatus?: "paid" | "unpaid";
    amountMinor?: number;
    currency?: string;
  }): string {
    return JSON.stringify({
      id: input.eventId,
      type: input.type ?? "checkout.session.completed",
      data: {
        object: {
          id: input.checkoutId,
          payment_status: input.paymentStatus ?? "paid",
          amount_total: input.amountMinor ?? 12900,
          currency: input.currency ?? "usd",
          metadata: {
            // Metadata is deliberately not used for tenant/Purchase routing.
            nexus_purchase_id: randomUUID(),
            nexus_organization_id: randomUUID()
          }
        }
      }
    });
  }

  function stripeSignature(rawBody: string, timestamp?: number): string {
    const signedAt = timestamp ?? Math.floor(Date.now() / 1000);
    const digest = createHmac("sha256", webhookSecret)
      .update(`${signedAt}.${rawBody}`)
      .digest("hex");
    return `t=${signedAt},v1=${digest}`;
  }

  async function sendStripeWebhook(
    rawBody: string,
    signature = stripeSignature(rawBody)
  ) {
    return app.inject({
      method: "POST",
      url: "/v1/integrations/payments/stripe/webhooks",
      headers: {
        "content-type": "application/json",
        "stripe-signature": signature
      },
      payload: rawBody
    });
  }

  beforeAll(async () => {
    previousPaymentProvider = process.env.PAYMENT_PROVIDER;
    previousWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    process.env.PAYMENT_PROVIDER = "test";
    process.env.STRIPE_WEBHOOK_SECRET = webhookSecret;

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
    if (app !== undefined) {
      await app.close();
    }

    if (migrationPool !== undefined && organizationId.length > 0) {
      await migrationPool.query(
        `DELETE FROM integrations.payment_webhook_inbox
          WHERE organization_id = $1
             OR external_checkout_id LIKE 'cs_test_%'`,
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
      delete process.env.STRIPE_WEBHOOK_SECRET;
    } else {
      process.env.STRIPE_WEBHOOK_SECRET = previousWebhookSecret;
    }
  });

  it("creates one server-priced pending Purchase and one idempotent checkout", async () => {
    const first = await app.inject({
      method: "POST",
      url: `/v1/organizations/${organizationId}/commerce/purchases`,
      headers: { "x-test-user-id": learnerAUserId },
      payload: {
        priceId,
        idempotencyKey: purchaseAIdempotencyKey
      }
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
    expect(created.checkoutUrl).toBe(
      `https://checkout.test/${purchaseAId}`
    );

    const retry = await app.inject({
      method: "POST",
      url: `/v1/organizations/${organizationId}/commerce/purchases`,
      headers: { "x-test-user-id": learnerAUserId },
      payload: {
        priceId,
        idempotencyKey: purchaseAIdempotencyKey
      }
    });
    expect(retry.statusCode).toBe(201);
    const replay = purchaseCheckoutSchema.parse(JSON.parse(retry.body));
    expect(replay.purchase.id).toBe(purchaseAId);
    expect(replay.checkoutUrl).toBe(created.checkoutUrl);

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

  it("rejects an invalid Stripe signature before durable inbox acceptance", async () => {
    const eventId = `evt_test_${randomUUID()}`;
    const rawBody = stripeEvent({
      eventId,
      checkoutId: checkoutA.external_checkout_id
    });
    const response = await sendStripeWebhook(
      rawBody,
      `t=${Math.floor(Date.now() / 1000)},v1=${"0".repeat(64)}`
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

  it("settles paid webhook atomically into Purchase + purchase-backed Entitlement", async () => {
    const eventId = `evt_test_${randomUUID()}`;
    const rawBody = stripeEvent({
      eventId,
      checkoutId: checkoutA.external_checkout_id
    });
    const first = await sendStripeWebhook(rawBody);
    expect(first.statusCode).toBe(202);

    const purchase = await migrationPool.query<PurchaseRow>(
      `SELECT status, amount_minor, currency, paid_at
         FROM commerce.purchases
        WHERE organization_id = $1
          AND id = $2`,
      [organizationId, purchaseAId]
    );
    expect(purchase.rows[0]?.status).toBe("paid");
    expect(purchase.rows[0]?.amount_minor).toBe(12900);
    expect(purchase.rows[0]?.currency).toBe("USD");
    expect(purchase.rows[0]?.paid_at).toBeInstanceOf(Date);

    const entitlement = await migrationPool.query<EntitlementRow>(
      `SELECT
         status,
         grant_source,
         source_purchase_id::text,
         granted_by_user_id::text
       FROM commerce.entitlements
       WHERE organization_id = $1
         AND offering_id = $2
         AND user_id = $3`,
      [organizationId, offeringId, learnerAUserId]
    );
    expect(entitlement.rows[0]).toEqual({
      status: "active",
      grant_source: "purchase",
      source_purchase_id: purchaseAId,
      granted_by_user_id: null
    });

    const enrollment = await migrationPool.query<{ count: string }>(
      `SELECT count(*)::text AS count
         FROM learning_delivery.enrollments
        WHERE organization_id = $1
          AND offering_id = $2
          AND user_id = $3`,
      [organizationId, offeringId, learnerAUserId]
    );
    expect(enrollment.rows[0]?.count).toBe("0");

    const duplicate = await sendStripeWebhook(rawBody);
    expect(duplicate.statusCode).toBe(202);

    const secondPaidEvent = stripeEvent({
      eventId: `evt_test_${randomUUID()}`,
      checkoutId: checkoutA.external_checkout_id,
      type: "checkout.session.async_payment_succeeded"
    });
    const second = await sendStripeWebhook(secondPaidEvent);
    expect(second.statusCode).toBe(202);

    const events = await migrationPool.query<{ event_name: string }>(
      `SELECT event_name
         FROM events.outbox
        WHERE organization_id = $1
          AND aggregate_id = $2
          AND event_name = 'purchase.paid'`,
      [organizationId, purchaseAId]
    );
    expect(events.rows).toHaveLength(1);

    const entitlementEvents = await migrationPool.query<{ count: string }>(
      `SELECT count(*)::text AS count
         FROM events.outbox
        WHERE organization_id = $1
          AND event_name = 'entitlement.granted'
          AND payload ->> 'sourcePurchaseId' = $2`,
      [organizationId, purchaseAId]
    );
    expect(entitlementEvents.rows[0]?.count).toBe("1");
  });

  it("rejects provider amount tampering even after a Purchase is paid", async () => {
    const tampered = stripeEvent({
      eventId: `evt_test_${randomUUID()}`,
      checkoutId: checkoutA.external_checkout_id,
      amountMinor: 1
    });
    const response = await sendStripeWebhook(tampered);
    expect(response.statusCode).toBe(409);

    const purchase = await migrationPool.query<PurchaseRow>(
      `SELECT status, amount_minor, currency, paid_at
         FROM commerce.purchases
        WHERE organization_id = $1
          AND id = $2`,
      [organizationId, purchaseAId]
    );
    expect(purchase.rows[0]?.status).toBe("paid");
    expect(purchase.rows[0]?.amount_minor).toBe(12900);
  });

  it("refuses a new Purchase when the learner already holds effective access", async () => {
    const response = await app.inject({
      method: "POST",
      url: `/v1/organizations/${organizationId}/commerce/purchases`,
      headers: { "x-test-user-id": learnerAUserId },
      payload: {
        priceId,
        idempotencyKey: randomUUID()
      }
    });
    expect(response.statusCode).toBe(409);
  });

  it("recovers when a signed webhook arrives before its checkout mapping commits", async () => {
    const create = await app.inject({
      method: "POST",
      url: `/v1/organizations/${organizationId}/commerce/purchases`,
      headers: { "x-test-user-id": learnerBUserId },
      payload: {
        priceId,
        idempotencyKey: purchaseBIdempotencyKey
      }
    });
    expect(create.statusCode).toBe(201);
    const purchase = purchaseCheckoutSchema.parse(JSON.parse(create.body));
    purchaseBId = purchase.purchase.id;
    checkoutB = await checkoutByPurchase(purchaseBId);

    await migrationPool.query(
      `DELETE FROM integrations.payment_checkouts
        WHERE organization_id = $1
          AND purchase_id = $2`,
      [organizationId, purchaseBId]
    );

    const eventId = `evt_test_${randomUUID()}`;
    const rawBody = stripeEvent({
      eventId,
      checkoutId: checkoutB.external_checkout_id
    });
    const early = await sendStripeWebhook(rawBody);
    expect(early.statusCode).toBe(503);

    const receiveFact = await migrationPool.query<{
      routing_status: string;
      organization_id: string | null;
      purchase_id: string | null;
    }>(
      `SELECT routing_status, organization_id::text, purchase_id::text
         FROM integrations.payment_webhook_inbox
        WHERE provider_event_id = $1`,
      [eventId]
    );
    expect(receiveFact.rows[0]).toEqual({
      routing_status: "unmapped_checkout",
      organization_id: null,
      purchase_id: null
    });

    await migrationPool.query(
      `INSERT INTO integrations.payment_checkouts (
         organization_id,
         purchase_id,
         provider_key,
         external_checkout_id,
         checkout_url,
         expires_at
       )
       VALUES ($1, $2, 'stripe', $3, $4, $5)`,
      [
        organizationId,
        purchaseBId,
        checkoutB.external_checkout_id,
        checkoutB.checkout_url,
        checkoutB.expires_at
      ]
    );

    const retry = await sendStripeWebhook(rawBody);
    expect(retry.statusCode).toBe(202);

    const settled = await migrationPool.query<PurchaseRow>(
      `SELECT status, amount_minor, currency, paid_at
         FROM commerce.purchases
        WHERE organization_id = $1
          AND id = $2`,
      [organizationId, purchaseBId]
    );
    expect(settled.rows[0]?.status).toBe("paid");

    const immutableReceiveFact = await migrationPool.query<{
      routing_status: string;
    }>(
      `SELECT routing_status
         FROM integrations.payment_webhook_inbox
        WHERE provider_event_id = $1`,
      [eventId]
    );
    expect(immutableReceiveFact.rows[0]?.routing_status).toBe(
      "unmapped_checkout"
    );
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
      can_update_purchase_status: true,
      can_delete_purchase: false,
      can_delete_checkout: false,
      can_read_webhook_inbox: false
    });
  });
});
