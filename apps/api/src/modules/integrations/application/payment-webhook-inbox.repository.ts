import type { DatabaseTransaction } from "@platform/database";

export type PaymentWebhookRoutingStatus = "mapped" | "unmapped_checkout";

export type PaymentWebhookInput = Readonly<{
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

export type AcceptedPaymentWebhook = Readonly<{
  inserted: boolean;
  receivedRoutingStatus: PaymentWebhookRoutingStatus;
  existingPayloadSha256: string | null;
}>;

export type PaymentCheckoutRoute = Readonly<{
  organizationId: string;
  purchaseId: string;
}>;

export abstract class PaymentWebhookInboxRepository {
  abstract accept(
    transaction: DatabaseTransaction,
    input: PaymentWebhookInput
  ): Promise<AcceptedPaymentWebhook>;

  abstract resolveCheckout(
    transaction: DatabaseTransaction,
    providerKey: "stripe",
    externalCheckoutId: string
  ): Promise<PaymentCheckoutRoute | null>;
}
