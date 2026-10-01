import { describe, expect, it } from "vitest";

import {
  publicCatalogProductSchema,
  publicCatalogSchema
} from "./public-catalog";

const priceId = "018f0f52-a3b4-7d11-8f56-5d7b0bd02e22";

const publicProduct = {
  slug: "professional-typescript",
  name: "Professional TypeScript",
  offering: {
    slug: "typescript-self-paced",
    name: "TypeScript self-paced",
    deliveryMode: "self_paced" as const,
    startsAt: null,
    endsAt: null
  },
  prices: [
    {
      id: priceId,
      amountMinor: 12900,
      currency: "USD",
      billingType: "one_time" as const
    }
  ]
};

describe("public catalog contracts", () => {
  it("accepts only the whitelisted commercial projection", () => {
    expect(
      publicCatalogSchema.parse({
        organization: {
          slug: "microstudio",
          name: "Microstudio"
        },
        products: [publicProduct]
      })
    ).toEqual({
      organization: {
        slug: "microstudio",
        name: "Microstudio"
      },
      products: [publicProduct]
    });
  });

  it("rejects internal Product, Offering, and tenant fields", () => {
    expect(() =>
      publicCatalogProductSchema.parse({
        ...publicProduct,
        id: "018f0f52-a3b4-7d11-8f56-5d7b0bd02e11",
        organizationId: "018f0f52-a3b4-7d11-8f56-5d7b0bd02e33",
        status: "active",
        offering: {
          ...publicProduct.offering,
          id: "018f0f52-a3b4-7d11-8f56-5d7b0bd02e44",
          courseVersionId: "018f0f52-a3b4-7d11-8f56-5d7b0bd02e55",
          accessMode: "entitlement_required"
        }
      })
    ).toThrow();
  });

  it("rejects internal Price lifecycle and ownership fields", () => {
    expect(() =>
      publicCatalogProductSchema.parse({
        ...publicProduct,
        prices: [
          {
            ...publicProduct.prices[0],
            productId: "018f0f52-a3b4-7d11-8f56-5d7b0bd02e66",
            status: "active",
            createdAt: "2026-10-01T00:00:00.000Z"
          }
        ]
      })
    ).toThrow();
  });
});
