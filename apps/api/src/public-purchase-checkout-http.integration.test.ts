import { randomUUID } from "node:crypto";

import type { NestFastifyApplication } from "@nestjs/platform-fastify";
import {
  commercePriceSchema,
  commerceProductSchema,
  learningOfferingSchema,
  publicPurchaseCheckoutSchema,
  publicPurchaseSchema
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
    throw new Error(`${name} is required for public checkout integration tests.`);
  }
  return value;
}

type IdRow = { id: string };
type CountRow = { count: string };

describe("public Purchase checkout authority", () => {
  const webOrigin = "https://web.example.test";
  const previousPaymentProvider = process.env.PAYMENT_PROVIDER;
  const previousWebOrigin = process.env.WEB_APP_ORIGIN;
  let migrationPool: DatabasePool;
  let app: NestFastifyApplication;

  let ownerUserId = "";
  let buyerUserId = "";
  let outsiderUserId = "";
  let organizationId = "";
  let courseId = "";
  let courseVersionId = "";
  let offeringId = "";
  let productId = "";
  let priceId = "";
  const organizationSlug = `public-checkout-${randomUUID()}`;
  const productSlug = `public-product-${randomUUID()}`;
  const createdUserIds: string[] = [];

  function browserHeaders(userId: string) {
    return { "x-test-user-id": userId, origin: webOrigin };
  }

  async function createUser(label: string): Promise<string> {
    const result = await migrationPool.query<IdRow>(
      `INSERT INTO identity.users (email, display_name)
       VALUES ($1, $2)
       RETURNING id::text`,
      [`${label}-${randomUUID()}@example.test`, label]
    );
    const id = result.rows[0]?.id;
    if (id === undefined) {
      throw new Error("Failed to create public-checkout test user.");
    }
    createdUserIds.push(id);
    return id;
  }

  async function addActiveMember(userId: string): Promise<void> {
    const invite = await app.inject({
      method: "POST",
      url: `/v1/organizations/${organizationId}/memberships`,
      headers: { "x-test-user-id": ownerUserId },
      payload: { userId }
    });
    if (invite.statusCode !== 201) {
      throw new Error(`Failed to invite public-checkout member: ${invite.body}`);
    }

    const accept = await app.inject({
      method: "POST",
      url: `/v1/organizations/${organizationId}/memberships/me/accept`,
      headers: { "x-test-user-id": userId }
    });
    if (accept.statusCode !== 200) {
      throw new Error(`Failed to activate public-checkout member: ${accept.body}`);
    }
  }

  beforeAll(async () => {
    process.env.PAYMENT_PROVIDER = "test";
    process.env.WEB_APP_ORIGIN = webOrigin;
    migrationPool = createDatabasePool(requireEnv("DATABASE_MIGRATION_URL"), {
      applicationName: "public-purchase-checkout-integration-fixtures"
    });

    ownerUserId = await createUser("public-checkout-owner");
    buyerUserId = await createUser("public-checkout-buyer");
    outsiderUserId = await createUser("public-checkout-outsider");

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

    const organization = await app.inject({
      method: "POST",
      url: "/v1/organizations",
      headers: { "x-test-user-id": ownerUserId },
      payload: {
        slug: organizationSlug,
        name: "Public Checkout Integration"
      }
    });
    if (organization.statusCode !== 201) {
      throw new Error(`Failed to create public-checkout org: ${organization.body}`);
    }
    organizationId = (JSON.parse(organization.body) as { id: string }).id;
    await addActiveMember(buyerUserId);

    const course = await app.inject({
      method: "POST",
      url: `/v1/organizations/${organizationId}/courses`,
      headers: { "x-test-user-id": ownerUserId },
      payload: {
        slug: `public-course-${randomUUID()}`,
        title: "Public paid course"
      }
    });
    if (course.statusCode !== 201) {
      throw new Error(`Failed to create public-checkout course: ${course.body}`);
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
      throw new Error(`Failed to publish public-checkout course: ${publish.body}`);
    }

    const offering = await app.inject({
      method: "POST",
      url: `/v1/organizations/${organizationId}/offerings`,
      headers: { "x-test-user-id": ownerUserId },
      payload: {
        courseVersionId,
        slug: `public-offering-${randomUUID()}`,
        name: "Public paid offering",
        deliveryMode: "self_paced",
        accessMode: "entitlement_required"
      }
    });
    if (offering.statusCode !== 201) {
      throw new Error(`Failed to create public-checkout offering: ${offering.body}`);
    }
    offeringId = learningOfferingSchema.parse(JSON.parse(offering.body)).id;

    const product = await app.inject({
      method: "POST",
      url: `/v1/organizations/${organizationId}/commerce/products`,
      headers: { "x-test-user-id": ownerUserId },
      payload: {
        offeringId,
        slug: productSlug,
        name: "Public Paid Product"
      }
    });
    if (product.statusCode !== 201) {
      throw new Error(`Failed to create public-checkout Product: ${product.body}`);
    }
    productId = commerceProductSchema.parse(JSON.parse(product.body)).id;

    const price = await app.inject({
      method: "POST",
      url: `/v1/organizations/${organizationId}/commerce/products/${productId}/prices`,
      headers: { "x-test-user-id": ownerUserId },
      payload: { amountMinor: 12900, currency: "USD" }
    });
    if (price.statusCode !== 201) {
      throw new Error(`Failed to create public-checkout Price: ${price.body}`);
    }
    priceId = commercePriceSchema.parse(JSON.parse(price.body)).id;
  });

  afterAll(async () => {
    if (app !== undefined) await app.close();

    if (migrationPool !== undefined && organizationId.length > 0) {
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

    if (previousPaymentProvider === undefined) delete process.env.PAYMENT_PROVIDER;
    else process.env.PAYMENT_PROVIDER = previousPaymentProvider;
    if (previousWebOrigin === undefined) delete process.env.WEB_APP_ORIGIN;
    else process.env.WEB_APP_ORIGIN = previousWebOrigin;
  });

  it("requires authentication and exact browser origin before checkout authority", async () => {
    const anonymous = await app.inject({
      method: "POST",
      url: `/v1/public/catalog/${organizationSlug}/products/${productSlug}/checkout`,
      payload: { priceId, idempotencyKey: randomUUID() }
    });
    expect(anonymous.statusCode).toBe(401);

    const missingOrigin = await app.inject({
      method: "POST",
      url: `/v1/public/catalog/${organizationSlug}/products/${productSlug}/checkout`,
      headers: { "x-test-user-id": buyerUserId },
      payload: { priceId, idempotencyKey: randomUUID() }
    });
    expect(missingOrigin.statusCode).toBe(403);

    const wrongOrigin = await app.inject({
      method: "POST",
      url: `/v1/public/catalog/${organizationSlug}/products/${productSlug}/checkout`,
      headers: {
        "x-test-user-id": buyerUserId,
        origin: "https://other.example.test"
      },
      payload: { priceId, idempotencyKey: randomUUID() }
    });
    expect(wrongOrigin.statusCode).toBe(403);
  });

  it("requires explicit active Organization membership", async () => {
    const response = await app.inject({
      method: "POST",
      url: `/v1/public/catalog/${organizationSlug}/products/${productSlug}/checkout`,
      headers: browserHeaders(outsiderUserId),
      payload: { priceId, idempotencyKey: randomUUID() }
    });
    expect(response.statusCode).toBe(404);

    const purchases = await migrationPool.query<CountRow>(
      `SELECT count(*)::text AS count
         FROM commerce.purchases
        WHERE organization_id = $1
          AND purchaser_user_id = $2`,
      [organizationId, outsiderUserId]
    );
    expect(purchases.rows[0]?.count).toBe("0");
  });

  it("creates an idempotent Purchase and exposes it only to its purchaser", async () => {
    const idempotencyKey = randomUUID();
    const first = await app.inject({
      method: "POST",
      url: `/v1/public/catalog/${organizationSlug}/products/${productSlug}/checkout`,
      headers: browserHeaders(buyerUserId),
      payload: { priceId, idempotencyKey }
    });
    expect(first.statusCode).toBe(201);
    const created = publicPurchaseCheckoutSchema.parse(JSON.parse(first.body));
    expect(created.purchase).toMatchObject({
      priceId,
      status: "pending",
      amountMinor: 12900,
      currency: "USD",
      billingType: "one_time",
      idempotencyKey,
      paidAt: null
    });
    expect(created.purchase).not.toHaveProperty("organizationId");
    expect(created.purchase).not.toHaveProperty("productId");
    expect(created.purchase).not.toHaveProperty("offeringId");
    expect(created.purchase).not.toHaveProperty("purchaserUserId");
    expect(created.checkoutUrl).toBe(
      `https://checkout.test/${created.purchase.id}`
    );

    const retry = await app.inject({
      method: "POST",
      url: `/v1/public/catalog/${organizationSlug}/products/${productSlug}/checkout`,
      headers: browserHeaders(buyerUserId),
      payload: { priceId, idempotencyKey }
    });
    expect(retry.statusCode).toBe(201);
    const replay = publicPurchaseCheckoutSchema.parse(JSON.parse(retry.body));
    expect(replay.purchase.id).toBe(created.purchase.id);
    expect(replay.checkoutUrl).toBe(created.checkoutUrl);

    const canonical = await migrationPool.query<{
      product_id: string;
      offering_id: string;
      purchaser_user_id: string;
    }>(
      `SELECT product_id::text, offering_id::text, purchaser_user_id::text
         FROM commerce.purchases
        WHERE id = $1`,
      [created.purchase.id]
    );
    expect(canonical.rows[0]).toEqual({
      product_id: productId,
      offering_id: offeringId,
      purchaser_user_id: buyerUserId
    });

    const anonymousRead = await app.inject({
      method: "GET",
      url: `/v1/me/purchases/${created.purchase.id}`
    });
    expect(anonymousRead.statusCode).toBe(401);

    const ownRead = await app.inject({
      method: "GET",
      url: `/v1/me/purchases/${created.purchase.id}`,
      headers: { "x-test-user-id": buyerUserId }
    });
    expect(ownRead.statusCode).toBe(200);
    expect(ownRead.headers["cache-control"]).toBe("no-store");
    const reconciled = publicPurchaseSchema.parse(JSON.parse(ownRead.body));
    expect(reconciled).toEqual(created.purchase);
    expect(reconciled).not.toHaveProperty("organizationId");
    expect(reconciled).not.toHaveProperty("productId");
    expect(reconciled).not.toHaveProperty("offeringId");
    expect(reconciled).not.toHaveProperty("purchaserUserId");

    const foreignRead = await app.inject({
      method: "GET",
      url: `/v1/me/purchases/${created.purchase.id}`,
      headers: { "x-test-user-id": outsiderUserId }
    });
    expect(foreignRead.statusCode).toBe(404);
  });

  it("fails closed for a mismatched route and rejects caller-owned money", async () => {
    const wrongRoute = await app.inject({
      method: "POST",
      url: `/v1/public/catalog/${organizationSlug}/products/not-the-product/checkout`,
      headers: browserHeaders(buyerUserId),
      payload: { priceId, idempotencyKey: randomUUID() }
    });
    expect(wrongRoute.statusCode).toBe(404);

    const callerPriced = await app.inject({
      method: "POST",
      url: `/v1/public/catalog/${organizationSlug}/products/${productSlug}/checkout`,
      headers: browserHeaders(buyerUserId),
      payload: {
        priceId,
        idempotencyKey: randomUUID(),
        amountMinor: 1,
        currency: "USD"
      }
    });
    expect(callerPriced.statusCode).toBe(400);
  });

  it("revalidates current sellability instead of trusting a prior catalog response", async () => {
    const catalog = await app.inject({
      method: "GET",
      url: `/v1/public/catalog/${organizationSlug}/products/${productSlug}`
    });
    expect(catalog.statusCode).toBe(200);

    const archive = await app.inject({
      method: "POST",
      url: `/v1/organizations/${organizationId}/commerce/products/${productId}/prices/${priceId}/archive`,
      headers: { "x-test-user-id": ownerUserId }
    });
    expect(archive.statusCode).toBe(200);
    expect(commercePriceSchema.parse(JSON.parse(archive.body)).status).toBe(
      "archived"
    );

    const checkout = await app.inject({
      method: "POST",
      url: `/v1/public/catalog/${organizationSlug}/products/${productSlug}/checkout`,
      headers: browserHeaders(buyerUserId),
      payload: { priceId, idempotencyKey: randomUUID() }
    });
    expect(checkout.statusCode).toBe(404);
  });
});
