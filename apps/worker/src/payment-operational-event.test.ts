import { describe, expect, it } from "vitest";

import {
  buildPaymentWorkerFailureEvent,
  buildPaymentWorkerOperationalEvent
} from "./payment-operational-event.js";

const forbiddenKey =
  /(^|_)(id|email|slug|url|origin|payload|body|signature|cookie|token|message)$/i;

function expectRedacted(value: unknown): void {
  if (typeof value !== "object" || value === null) return;
  for (const [key, nested] of Object.entries(value)) {
    expect(key).not.toMatch(forbiddenKey);
    expectRedacted(nested);
  }
}

describe("payment worker operational event", () => {
  it("drops durable inbox and purchase identifiers from completed cycles", () => {
    const event = buildPaymentWorkerOperationalEvent(
      {
        kind: "completed",
        inboxId: "11111111-1111-4111-8111-111111111111",
        purchaseId: "22222222-2222-4222-8222-222222222222",
        paymentStatus: "paid"
      },
      18.8
    );

    expect(event).toEqual({
      event: "public_launch.payment_worker",
      outcome: "completed",
      durationMs: 18,
      paymentStatus: "paid"
    });
    expectRedacted(event);
    expect(JSON.stringify(event)).not.toContain("11111111");
    expect(JSON.stringify(event)).not.toContain("22222222");
  });

  it("keeps worker failures categorical without logging exception messages", () => {
    const event = buildPaymentWorkerFailureEvent(
      "cycle_failure",
      4,
      new Error("purchase 22222222-2222-4222-8222-222222222222 failed")
    );
    expect(event).toEqual({
      event: "public_launch.payment_worker",
      outcome: "cycle_failure",
      durationMs: 4,
      errorName: "Error"
    });
    expectRedacted(event);
    expect(JSON.stringify(event)).not.toContain("purchase 22222222");
  });
});
