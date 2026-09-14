import { describe, expect, it } from "vitest";

import {
  entitlementSchema,
  grantOfferingEntitlementRequestSchema
} from "./commerce";

const id = "018f47f1-16ce-7d1f-8f65-c61d8be24a31";
const offeringId = "018f47f1-16ce-7d1f-8f65-c61d8be24a32";
const userId = "018f47f1-16ce-7d1f-8f65-c61d8be24a33";

describe("commerce entitlement contracts", () => {
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
});
