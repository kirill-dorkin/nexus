import { describe, expect, it } from "vitest";

import {
  commercePriceSchema,
  commerceProductSchema,
  createCommercePriceRequestSchema,
  createCommerceProductRequestSchema,
  entitlementSchema,
  grantOfferingEntitlementRequestSchema
} from "./commerce";

const id = "018f47f1-16ce-7d1f-8f65-c61d8be24a31";
const offeringId = "018f47f1-16ce-7d1f-8f65-c61d8be24a32";
const userId = "018f47f1-16ce-7d1f-8f65-c61d8be24a33";
const productId = "018f47f1-16ce-7d1f-8f65-c61d8be24a34";

describe("commerce contracts", () => {
  it("keeps entitlement separate from enrollment and payment state", () => {
    expect(
      entitlementSchema.parse({
        id,
        organizationId: id,
        offeringId,
        userId,
        status: "active",
        grantedAt: "2026-09-14T12:00:00.000Z",
        expiresAt: null,
        revokedAt: null
      })
    ).toMatchObject({ offeringId, userId, status: "active" });
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
        id,
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
});
