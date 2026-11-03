import { describe, expect, it } from "vitest";

import {
  organizationCustomerEntryPolicySchema,
  updateCustomerEntryPolicyRequestSchema
} from "./organizations";

describe("customer membership entry contracts", () => {
  it("accepts only explicit open or closed entry policies", () => {
    expect(
      updateCustomerEntryPolicyRequestSchema.parse({ policy: "open" })
    ).toEqual({
      policy: "open"
    });
    expect(
      organizationCustomerEntryPolicySchema.parse({ policy: "closed" })
    ).toEqual({
      policy: "closed"
    });
    expect(() =>
      updateCustomerEntryPolicyRequestSchema.parse({ policy: "automatic" })
    ).toThrow();
  });

  it("rejects policy payloads with unrelated authority fields", () => {
    expect(() =>
      updateCustomerEntryPolicyRequestSchema.parse({
        policy: "open",
        organizationId: "018f0f52-a3b4-7d11-8f56-5d7b0bd02e33",
        role: "organization_owner"
      })
    ).toThrow();
  });
});
