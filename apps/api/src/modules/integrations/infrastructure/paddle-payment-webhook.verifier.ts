import {
  BadRequestException,
  ServiceUnavailableException,
  UnauthorizedException
} from "@nestjs/common";
import { createHash, createHmac, timingSafeEqual } from "node:crypto";

import type { PaymentWebhookInput } from "../application/payment-webhook-inbox.repository";
import { PaymentWebhookVerifier } from "../application/payment-webhook.verifier";

const signatureToleranceSeconds = 5;
const maxMinorAmount = 2_147_483_647;

function asRecord(value: unknown, message: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new BadRequestException(message);
  }
  return value as Record<string, unknown>;
}

function parseMinorAmount(
  value: unknown,
  field: string,
  allowZero = false
): number {
  if (typeof value !== "string" || !/^\d+$/.test(value)) {
    throw new BadRequestException(`Paddle ${field} is invalid.`);
  }
  const amount = Number(value);
  if (
    !Number.isSafeInteger(amount) ||
    amount > maxMinorAmount ||
    (allowZero ? amount < 0 : amount <= 0)
  ) {
    throw new BadRequestException(`Paddle ${field} is outside supported bounds.`);
  }
  return amount;
}

function parseSignatureHeader(signature: string): {
  timestamp: string;
  signatures: string[];
} {
  const parts = signature.split(";");
  const timestamps: string[] = [];
  const signatures: string[] = [];
  for (const part of parts) {
    const separator = part.indexOf("=");
    if (separator <= 0) continue;
    const key = part.slice(0, separator).trim();
    const value = part.slice(separator + 1).trim();
    if (key === "ts" && value.length > 0) timestamps.push(value);
    if (key === "h1" && /^[a-f\d]{64}$/i.test(value)) signatures.push(value);
  }
  if (timestamps.length !== 1 || signatures.length === 0) {
    throw new UnauthorizedException("Invalid Paddle webhook signature.");
  }
  return { timestamp: timestamps[0]!, signatures };
}

export class PaddlePaymentWebhookVerifier extends PaymentWebhookVerifier {
  verify(rawBody: Buffer, signature: string | undefined): PaymentWebhookInput {
    const secret = process.env.PADDLE_WEBHOOK_SECRET;
    if (secret === undefined || secret.trim().length === 0) {
      throw new ServiceUnavailableException(
        "PADDLE_WEBHOOK_SECRET is required for Paddle webhooks."
      );
    }
    if (signature === undefined || signature.length === 0) {
      throw new UnauthorizedException("Missing Paddle webhook signature.");
    }

    const parsedSignature = parseSignatureHeader(signature);
    if (!/^\d+$/.test(parsedSignature.timestamp)) {
      throw new UnauthorizedException("Invalid Paddle webhook timestamp.");
    }
    const timestamp = Number(parsedSignature.timestamp);
    const nowSeconds = Math.floor(Date.now() / 1000);
    if (
      !Number.isSafeInteger(timestamp) ||
      Math.abs(nowSeconds - timestamp) > signatureToleranceSeconds
    ) {
      throw new UnauthorizedException("Expired Paddle webhook signature.");
    }

    const expected = createHmac("sha256", secret.trim())
      .update(`${parsedSignature.timestamp}:`)
      .update(rawBody)
      .digest();
    const verified = parsedSignature.signatures.some((candidate) => {
      const candidateBuffer = Buffer.from(candidate, "hex");
      return (
        candidateBuffer.length === expected.length &&
        timingSafeEqual(candidateBuffer, expected)
      );
    });
    if (!verified) {
      throw new UnauthorizedException("Invalid Paddle webhook signature.");
    }

    let decoded: unknown;
    try {
      decoded = JSON.parse(rawBody.toString("utf8"));
    } catch {
      throw new BadRequestException("Paddle webhook body is invalid JSON.");
    }

    const envelope = asRecord(decoded, "Paddle webhook body is invalid.");
    const eventId = envelope.event_id;
    const eventType = envelope.event_type;
    if (
      typeof eventId !== "string" ||
      !/^evt_[a-z\d]{26}$/.test(eventId) ||
      eventType !== "transaction.completed"
    ) {
      throw new BadRequestException("Unsupported Paddle webhook event.");
    }

    const data = asRecord(envelope.data, "Paddle transaction payload is invalid.");
    const transactionId = data.id;
    if (
      typeof transactionId !== "string" ||
      !/^txn_[a-z\d]{26}$/.test(transactionId) ||
      data.status !== "completed" ||
      data.collection_mode !== "automatic"
    ) {
      throw new BadRequestException("Paddle transaction is not settleable.");
    }

    const currency = data.currency_code;
    if (typeof currency !== "string" || !/^[A-Z]{3}$/.test(currency)) {
      throw new BadRequestException("Paddle transaction currency is invalid.");
    }

    const details = asRecord(data.details, "Paddle transaction details are invalid.");
    const totals = asRecord(details.totals, "Paddle transaction totals are invalid.");
    if (
      typeof totals.currency_code !== "string" ||
      totals.currency_code !== currency
    ) {
      throw new BadRequestException("Paddle transaction currency is inconsistent.");
    }
    const subtotal = parseMinorAmount(totals.subtotal, "subtotal");
    const discount = parseMinorAmount(totals.discount, "discount", true);
    const amountMinor = subtotal - discount;
    if (amountMinor <= 0) {
      throw new BadRequestException(
        "Paddle discounted transaction amount is not supported."
      );
    }

    return {
      providerKey: "paddle",
      providerEventId: eventId,
      externalCheckoutId: transactionId,
      eventType: "transaction.completed",
      paymentStatus: "paid",
      amountMinor,
      currency,
      payloadSha256: createHash("sha256").update(rawBody).digest("hex")
    };
  }
}
