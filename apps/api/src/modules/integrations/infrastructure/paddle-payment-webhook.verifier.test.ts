import { createHmac } from "node:crypto";

import { UnauthorizedException } from "@nestjs/common";
import { afterEach, describe, expect, it, vi } from "vitest";

import { PaddlePaymentWebhookVerifier } from "./paddle-payment-webhook.verifier";

const webhookSecret = "test-paddle-webhook-secret-with-sufficient-entropy";
const eventId = "evt_01h04vsbhqc62t8hmd4z3b578c";
const transactionId = "txn_01h04vsbhqc62t8hmd4z3b578c";

function completedTransactionBody(): Buffer {
  return Buffer.from(
    JSON.stringify({
      event_id: eventId,
      event_type: "transaction.completed",
      data: {
        id: transactionId,
        status: "completed",
        collection_mode: "automatic",
        currency_code: "USD",
        details: {
          totals: {
            currency_code: "USD",
            subtotal: "12900",
            discount: "100",
            tax: "1024",
            total: "13824"
          }
        }
      }
    })
  );
}

function signature(rawBody: Buffer, timestamp: number): string {
  return createHmac("sha256", webhookSecret)
    .update(`${timestamp}:`)
    .update(rawBody)
    .digest("hex");
}

describe("PaddlePaymentWebhookVerifier", () => {
  const previousSecret = process.env.PADDLE_WEBHOOK_SECRET;

  afterEach(() => {
    vi.useRealTimers();
    if (previousSecret === undefined) delete process.env.PADDLE_WEBHOOK_SECRET;
    else process.env.PADDLE_WEBHOOK_SECRET = previousSecret;
  });

  it("verifies raw-body signature and normalizes commercial amount before tax after discount", () => {
    process.env.PADDLE_WEBHOOK_SECRET = webhookSecret;
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-01T11:00:00.000Z"));
    const timestamp = Math.floor(Date.now() / 1000);
    const rawBody = completedTransactionBody();
    const valid = signature(rawBody, timestamp);

    const result = new PaddlePaymentWebhookVerifier().verify(
      rawBody,
      `ts=${timestamp};h1=${"0".repeat(64)};h1=${valid}`
    );

    expect(result).toMatchObject({
      providerKey: "paddle",
      providerEventId: eventId,
      externalCheckoutId: transactionId,
      eventType: "transaction.completed",
      paymentStatus: "paid",
      amountMinor: 12800,
      currency: "USD"
    });
    expect(result.payloadSha256).toMatch(/^[a-f\d]{64}$/);
  });

  it("rejects a correctly signed webhook outside the timestamp tolerance", () => {
    process.env.PADDLE_WEBHOOK_SECRET = webhookSecret;
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-01T11:00:10.000Z"));
    const timestamp = Math.floor(Date.now() / 1000) - 6;
    const rawBody = completedTransactionBody();

    expect(() =>
      new PaddlePaymentWebhookVerifier().verify(
        rawBody,
        `ts=${timestamp};h1=${signature(rawBody, timestamp)}`
      )
    ).toThrow(UnauthorizedException);
  });
});
