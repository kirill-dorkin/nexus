import { describe, expect, it } from "vitest";

import {
  organizationCustomerEntryPolicySchema,
  updateCustomerEntryPolicyRequestSchema
} from "./organizations";
import { publicCatalogOrganizationSchema } from "./public-catalog";

describe("customer membership entry contracts", () => {
  it("accepts only explicit open or closed entry policies", () => {
    expect(updateCustomerEntryPolicyRequestSchema.parse({ policy: "open" })).toEqual({
      policy: "open"
    });
    expect(organizationCustomerEntryPolicySchema.parse({ policy: "closed" })).toEqual({
      policy: "closed"
    });
    expect(() =>
      updateCustomerEntryPolicyRequestSchema.parse({ policy: "automatic" })
    ).toThrow();
  });

  it("keeps the public policy hint inside the strict organization projection", () => {
    expect(
      publicCatalogOrganizationSchema.parse({
        slug: "microstudio",
        name: "Microstudio",
        customerEntryPolicy: "open"
      })
    ).toEqual({
      slug: "microstudio",
      name: "Microstudio",
      customerEntryPolicy: "open"
    });

    expect(() =>
      publicCatalogOrganizationSchema.parse({
        slug: "microstudio",
        name: "Microstudio",
        customerEntryPolicy: "open",
        organizationId: "018f0f52-a3b4-7d11-8f56-5d7b0bd02e33"
      })
    ).toThrow();
  });
});
