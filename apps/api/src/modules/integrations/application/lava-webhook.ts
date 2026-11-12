import { timingSafeEqual } from "node:crypto";

/** Constant-time comparison of the X-Api-Key header with the configured secret. */
export function lavaWebhookAuthorized(
  supplied: string | undefined,
  secret: string
): boolean {
  if (supplied === undefined) return false;
  const a = Buffer.from(supplied, "utf8");
  const b = Buffer.from(secret, "utf8");
  return a.length === b.length && timingSafeEqual(a, b);
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const text = (value: unknown, max = 100): string | null =>
  typeof value === "string" && value.length > 0 && value.length <= max
    ? value
    : null;
const uuid = (value: unknown): string | null =>
  typeof value === "string" && UUID.test(value) ? value.toLowerCase() : null;
const instant = (value: unknown): string | null =>
  typeof value === "string" && !Number.isNaN(Date.parse(value)) ? value : null;

export type NormalizedLavaEvent = Readonly<{
  eventKey: string;
  eventType: string;
  contractId: string | null;
  parentContractId: string | null;
  amountMinor: number | null;
  currency: string | null;
  occurredAt: string;
}>;

/**
 * Normalizes both webhook shapes: contract events (payments, renewals, cancellation) and
 * refund/chargeback events, which carry no contract and go to manual review. Null when the body
 * is neither.
 */
export function normalizeLavaEvent(
  body: unknown,
  receivedAt: Date
): NormalizedLavaEvent | null {
  if (typeof body !== "object" || body === null) return null;
  const event = body as Record<string, unknown>;
  const eventType = text(event.eventType);
  if (eventType !== null) {
    const contractId = uuid(event.contractId);
    const parentContractId = uuid(event.parentContractId);
    const occurredAt =
      instant(event.timestamp) ??
      instant(event.cancelledAt) ??
      receivedAt.toISOString();
    const amount =
      typeof event.amount === "number" &&
      Number.isFinite(event.amount) &&
      event.amount > 0
        ? Math.round(event.amount * 100)
        : null;
    const currency =
      typeof event.currency === "string" && /^[A-Z]{3}$/.test(event.currency)
        ? event.currency
        : null;
    return {
      eventKey: [
        eventType,
        contractId ?? "-",
        parentContractId ?? "-",
        occurredAt
      ].join(":"),
      eventType,
      contractId,
      parentContractId,
      amountMinor: amount,
      currency,
      occurredAt
    };
  }
  const reviewType = text(event.event_type);
  const reviewId = text(event.event_id);
  if (reviewType !== null && reviewId !== null)
    return {
      eventKey: `${reviewType}:${reviewId}`,
      eventType: reviewType,
      contractId: null,
      parentContractId: null,
      amountMinor: null,
      currency: null,
      occurredAt: instant(event.created_at) ?? receivedAt.toISOString()
    };
  return null;
}
