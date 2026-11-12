import { ServiceUnavailableException } from "@nestjs/common";

/**
 * Deployment configuration (ADR-0087 §8). `LAVA_OFFERS` maps a platform subscription price id to
 * the lava offer id the owner created for it, e.g. `{"<price uuid>":"<lava offer uuid>"}`.
 */
export function lavaOfferId(priceId: string): string {
  const raw = process.env.LAVA_OFFERS?.trim();
  if (!raw)
    throw new ServiceUnavailableException("Subscriptions are not open yet.");
  let offers: unknown;
  try {
    offers = JSON.parse(raw);
  } catch {
    throw new ServiceUnavailableException("LAVA_OFFERS is not valid JSON.");
  }
  const offerId =
    typeof offers === "object" &&
    offers !== null &&
    Object.hasOwn(offers, priceId)
      ? (offers as Record<string, unknown>)[priceId]
      : undefined;
  if (typeof offerId !== "string" || offerId.length === 0)
    throw new ServiceUnavailableException(
      "This price is not connected to the payment provider yet."
    );
  return offerId;
}

export function requireLavaSetting(
  name: "LAVA_API_KEY" | "LAVA_WEBHOOK_SECRET"
): string {
  const value = process.env[name]?.trim();
  if (!value)
    throw new ServiceUnavailableException("Subscriptions are not open yet.");
  return value;
}
