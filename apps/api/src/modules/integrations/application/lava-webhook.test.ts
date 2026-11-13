import { describe, expect, it } from "vitest";

import { lavaWebhookAuthorized, normalizeLavaEvent } from "./lava-webhook";

const at = new Date("2026-11-13T10:00:00.000Z");

describe("lava.top webhooks (ADR-0087 §6)", () => {
  it("accepts only the exact shared secret", () => {
    expect(lavaWebhookAuthorized("s3cret-value", "s3cret-value")).toBe(true);
    expect(lavaWebhookAuthorized("s3cret-valuX", "s3cret-value")).toBe(false);
    expect(lavaWebhookAuthorized("short", "s3cret-value")).toBe(false);
    expect(lavaWebhookAuthorized(undefined, "s3cret-value")).toBe(false);
  });

  it("normalizes a renewal into minor units with a stable key", () => {
    expect(
      normalizeLavaEvent(
        {
          eventType: "subscription.recurring.payment.success",
          product: { id: "72d53efb-3696-469f-b856-f0d815748dd6" },
          buyer: { email: "a@example.test" },
          contractId: "d41db415-ad71-4f2a-8d8c-27eefee91e66",
          parentContractId: "c5a0cacc-3453-44b0-9532-aa492f1ba191",
          amount: 990,
          currency: "RUB",
          timestamp: "2024-02-05T08:44:49.123932Z",
          status: "subscription-active"
        },
        at
      )
    ).toEqual({
      eventKey:
        "subscription.recurring.payment.success:d41db415-ad71-4f2a-8d8c-27eefee91e66:c5a0cacc-3453-44b0-9532-aa492f1ba191:2024-02-05T08:44:49.123932Z",
      eventType: "subscription.recurring.payment.success",
      contractId: "d41db415-ad71-4f2a-8d8c-27eefee91e66",
      parentContractId: "c5a0cacc-3453-44b0-9532-aa492f1ba191",
      amountMinor: 99000,
      currency: "RUB",
      occurredAt: "2024-02-05T08:44:49.123932Z"
    });
  });

  it("rounds kopecks exactly and keeps refunds for review", () => {
    expect(
      normalizeLavaEvent(
        {
          eventType: "payment.success",
          contractId: "7ea82675-4ded-4133-95a7-a6efbaf165cc",
          amount: 2049.85,
          currency: "RUB",
          timestamp: "2024-02-05T08:44:32.42176Z"
        },
        at
      )?.amountMinor
    ).toBe(204985);
    expect(
      normalizeLavaEvent(
        {
          event_id: "7ea82675-4ded-4133-95a7-a6efbaf165cc",
          event_type: "refund.success",
          created_at: "2024-02-05T09:38:27.33277Z",
          data: { amount: 990 }
        },
        at
      )
    ).toMatchObject({
      eventKey: "refund.success:7ea82675-4ded-4133-95a7-a6efbaf165cc",
      contractId: null
    });
    expect(normalizeLavaEvent({ hello: "world" }, at)).toBeNull();
  });
});
