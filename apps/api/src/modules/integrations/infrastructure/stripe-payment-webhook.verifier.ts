import {
  createHash,
  createHmac,
  timingSafeEqual
} from "node:crypto";

import {
  BadRequestException,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException
} from "@nestjs/common";

export type VerifiedStripePaymentWebhook = Readonly<{
  providerKey: "stripe";
  providerEventId: string;
  externalCheckoutId: string;
  eventType:
    | "checkout.session.completed"
    | "checkout.session.async_payment_succeeded";
  paymentStatus: "paid" | "unpaid" | "no_payment_required";
  amountMinor: number;
  currency: string;
  payloadSha256: string;
}>;

const allowedEventTypes = new Set([
  "checkout.session.completed",
  "checkout.session.async_payment_succeeded"
]);

const paymentStatuses = new Set([
  "paid",
  "unpaid",
  "no_payment_required"
]);

function requireWebhookSecret(): string {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (secret === undefined || secret.trim().length < 16) {
    throw new ServiceUnavailableException(
      "STRIPE_WEBHOOK_SECRET is not configured."
    );
  }
  return secret;
}

function requireObject(value: unknown, field: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new BadRequestException(`${field} must be an object.`);
  }
  return value as Record<string, unknown>;
}

function safeSignatureBuffer(value: string): Buffer | null {
  if (!/^[0-9a-f]{64}$/i.test(value)) return null;
  return Buffer.from(value, "hex");
}

@Injectable()
export class StripePaymentWebhookVerifier {
  verify(
    rawBody: Buffer,
    signatureHeader: string | undefined
  ): VerifiedStripePaymentWebhook {
    if (signatureHeader === undefined || signatureHeader.length > 4096) {
      throw new UnauthorizedException("Invalid Stripe webhook signature.");
    }

    let timestamp: number | null = null;
    const signatures: string[] = [];
    for (const segment of signatureHeader.split(",")) {
      const [key, value] = segment.trim().split("=", 2);
      if (key === "t" && value !== undefined && /^[0-9]+$/.test(value)) {
        timestamp = Number(value);
      } else if (key === "v1" && value !== undefined) {
        signatures.push(value);
      }
    }

    if (
      timestamp === null ||
      !Number.isSafeInteger(timestamp) ||
      signatures.length === 0 ||
      Math.abs(Math.floor(Date.now() / 1000) - timestamp) > 300
    ) {
      throw new UnauthorizedException("Invalid Stripe webhook signature.");
    }

    const secret = requireWebhookSecret();
    const expected = createHmac("sha256", secret)
      .update(String(timestamp), "utf8")
      .update(".", "utf8")
      .update(rawBody)
      .digest();

    const valid = signatures.some((signature) => {
      const candidate = safeSignatureBuffer(signature);
      return (
        candidate !== null &&
        candidate.length === expected.length &&
        timingSafeEqual(candidate, expected)
      );
    });
    if (!valid) {
      throw new UnauthorizedException("Invalid Stripe webhook signature.");
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(rawBody.toString("utf8"));
    } catch {
      throw new BadRequestException("Stripe webhook body must be valid JSON.");
    }

    const event = requireObject(parsed, "Stripe webhook event");
    const providerEventId = event.id;
    const eventType = event.type;
    const data = requireObject(event.data, "Stripe webhook data");
    const session = requireObject(data.object, "Stripe Checkout Session");
    const externalCheckoutId = session.id;
    const paymentStatus = session.payment_status;
    const amountMinor = session.amount_total;
    const currency = session.currency;

    if (
      typeof providerEventId !== "string" ||
      providerEventId.length < 3 ||
      providerEventId.length > 255
    ) {
      throw new BadRequestException("Invalid Stripe event id.");
    }
    if (
      typeof eventType !== "string" ||
      !allowedEventTypes.has(eventType)
    ) {
      throw new BadRequestException("Unsupported Stripe webhook event.");
    }
    if (
      typeof externalCheckoutId !== "string" ||
      externalCheckoutId.length < 3 ||
      externalCheckoutId.length > 255
    ) {
      throw new BadRequestException("Invalid Stripe Checkout Session id.");
    }
    if (
      typeof paymentStatus !== "string" ||
      !paymentStatuses.has(paymentStatus)
    ) {
      throw new BadRequestException(
        "Invalid Stripe Checkout payment status."
      );
    }
    if (
      typeof amountMinor !== "number" ||
      !Number.isSafeInteger(amountMinor) ||
      amountMinor <= 0 ||
      amountMinor > 2147483647
    ) {
      throw new BadRequestException(
        "Stripe Checkout amount_total must be a positive integer."
      );
    }
    if (
      typeof currency !== "string" ||
      !/^[a-zA-Z]{3}$/.test(currency)
    ) {
      throw new BadRequestException("Invalid Stripe Checkout currency.");
    }

    return {
      providerKey: "stripe",
      providerEventId,
      externalCheckoutId,
      eventType: eventType as VerifiedStripePaymentWebhook["eventType"],
      paymentStatus:
        paymentStatus as VerifiedStripePaymentWebhook["paymentStatus"],
      amountMinor,
      currency: currency.toUpperCase(),
      payloadSha256: createHash("sha256").update(rawBody).digest("hex")
    };
  }
}
