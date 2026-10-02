import { describe, expect, it } from "vitest";

import {
  commercePriceSchema,
  commerceProductSchema,
  createCommercePriceRequestSchema,
  createCommerceProductRequestSchema,
  createPurchaseCheckoutRequestSchema,
  entitlementSchema,
  grantOfferingEntitlementRequestSchema,
  publicPurchaseCheckoutSchema,
  purchaseSchema
} from "./commerce";

const id = "018f47f1-16ce-7d1f-8f65-c61d8be24a31";
const offeringId = "018f47f1-16ce-7d1f-8f65-c61d8be24a32";
const userId = "018f47f1-16ce-7d1f-8f65-c61d8be24a33";
const productId = "018f47f1-16ce-7d1f-8f65-c61d8be24a34";
const priceId = "018f47f1-16ce-7d1f-8f65-c61d8be24a35";
const purchaseId = "018f47f1-16ce-7d1f-8f65-c61d8be24a36";
const idempotencyKey = "018f47f1-16ce-7d1f-8f65-c61d8be24a37";

describe("commerce contracts", () => {
  it("keeps entitlement separate from enrollment and payment state", () => {
    expect(
      entitlementSchema.parse({
        id,
        organizationId: id,
        offeringId,
        userId,
        status: "active",
        grantSource: "manual",
        sourcePurchaseId: null,
        grantedAt: "2026-09-14T12:00:00.000Z",
        expiresAt: null,
        revokedAt: null
      })
    ).toMatchObject({
      offeringId,
      userId,
      status: "active",
      grantSource: "manual",
      sourcePurchaseId: null
    });
  });

  it("accepts manual offering access with optional expiry", () => {
    expect(
      grantOfferingEntitlementRequestSchema.parse({
        userId,
        expiresAt: "2026-12-31T23:59:59.000Z"
      })
    ).toEqual({
      userId,
      expiresAt: "2026-12-31T23:59:59.000Z"
    });
  });

  it("defines a stable Product independently from Price and Entitlement", () => {
    expect(
      commerceProductSchema.parse({
        id: productId,
        organizationId: id,
        offeringId,
        slug: "javascript-core",
        name: "JavaScript Core",
        status: "active",
        createdAt: "2026-09-18T10:00:00.000Z",
        archivedAt: null
      })
    ).toMatchObject({
      offeringId,
      slug: "javascript-core",
      status: "active"
    });

    expect(
      createCommerceProductRequestSchema.parse({
        offeringId,
        slug: "javascript-core",
        name: "JavaScript Core"
      })
    ).toEqual({
      offeringId,
      slug: "javascript-core",
      name: "JavaScript Core"
    });
  });

  it("uses positive minor-unit immutable Price terms with explicit currency", () => {
    expect(
      commercePriceSchema.parse({
        id: priceId,
        organizationId: id,
        productId,
        amountMinor: 12900,
        currency: "USD",
        billingType: "one_time",
        status: "active",
        createdAt: "2026-09-18T10:00:00.000Z",
        archivedAt: null
      })
    ).toMatchObject({
      productId,
      amountMinor: 12900,
      currency: "USD",
      billingType: "one_time"
    });

    expect(
      createCommercePriceRequestSchema.parse({
        amountMinor: 12900,
        currency: "USD"
      })
    ).toEqual({
      amountMinor: 12900,
      currency: "USD",
      billingType: "one_time"
    });
  });

  it("rejects caller money formats that would make Price meaning ambiguous", () => {
    expect(
      createCommercePriceRequestSchema.safeParse({
        amountMinor: 12.99,
        currency: "USD"
      }).success
    ).toBe(false);

    expect(
      createCommercePriceRequestSchema.safeParse({
        amountMinor: 1299,
        currency: "usd"
      }).success
    ).toBe(false);

    expect(
      createCommercePriceRequestSchema.safeParse({
        amountMinor: 0,
        currency: "USD"
      }).success
    ).toBe(false);
  });

  it("pins canonical Purchase terms independently from Entitlement and Enrollment", () => {
    expect(
      purchaseSchema.parse({
        id: purchaseId,
        organizationId: id,
        productId,
        priceId,
        offeringId,
        purchaserUserId: userId,
        status: "pending",
        amountMinor: 12900,
        currency: "USD",
        billingType: "one_time",
        idempotencyKey,
        createdAt: "2026-09-19T06:00:00.000Z",
        paidAt: null
      })
    ).toMatchObject({
      productId,
      priceId,
      offeringId,
      purchaserUserId: userId,
      amountMinor: 12900,
      currency: "USD",
      status: "pending"
    });
  });

  it("lets checkout select only an exact Price and idempotency identity", () => {
    expect(
      createPurchaseCheckoutRequestSchema.parse({
        priceId,
        idempotencyKey
      })
    ).toEqual({ priceId, idempotencyKey });

    expect(
      createPurchaseCheckoutRequestSchema.safeParse({
        priceId,
        idempotencyKey,
        amountMinor: 1,
        currency: "USD"
      }).success
    ).toBe(false);
  });

  it("keeps the browser checkout response narrower than canonical Purchase", () => {
    const checkout = publicPurchaseCheckoutSchema.parse({
      purchase: {
        id: purchaseId,
        organizationId: id,
        productId,
        priceId,
        offeringId,
        purchaserUserId: userId,
        status: "pending",
        amountMinor: 12900,
        currency: "USD",
        billingType: "one_time",
        idempotencyKey,
        createdAt: "2026-09-19T06:00:00.000Z",
        paidAt: null
      },
      checkoutUrl: "https://checkout.example.test/txn",
      checkoutExpiresAt: null
    });

    expect(checkout.purchase).toEqual({
      id: purchaseId,
      priceId,
      status: "pending",
      amountMinor: 12900,
      currency: "USD",
      billingType: "one_time",
      idempotencyKey,
      createdAt: "2026-09-19T06:00:00.000Z",
      paidAt: null
    });
    expect(checkout.purchase).not.toHaveProperty("organizationId");
    expect(checkout.purchase).not.toHaveProperty("productId");
    expect(checkout.purchase).not.toHaveProperty("offeringId");
    expect(checkout.purchase).not.toHaveProperty("purchaserUserId");
  });
});
