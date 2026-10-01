import type { DatabaseTransaction } from "@platform/database";

export type PaymentWebhookRoutingStatus = "mapped" | "unmapped_checkout";
export type NormalizedPaymentStatus = "paid" | "unpaid" | "no_payment_required";

export type PaymentWebhookInput = Readonly<{
  providerKey: string;
  providerEventId: string;
  externalCheckoutId: string;
  eventType: string;
  paymentStatus: NormalizedPaymentStatus;
  amountMinor: number;
  currency: string;
  payloadSha256: string;
}>;

export type AcceptedPaymentWebhook = Readonly<{
  inserted: boolean;
  receivedRoutingStatus: PaymentWebhookRoutingStatus;
  existingPayloadSha256: string | null;
}>;

export abstract class PaymentWebhookInboxRepository {
  abstract accept(
    transaction: DatabaseTransaction,
    input: PaymentWebhookInput
  ): Promise<AcceptedPaymentWebhook>;
}
