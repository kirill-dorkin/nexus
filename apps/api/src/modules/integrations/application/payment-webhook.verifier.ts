import type { PaymentWebhookInput } from "./payment-webhook-inbox.repository";

export abstract class PaymentWebhookVerifier {
  abstract verify(
    rawBody: Buffer,
    signature: string | undefined
  ): PaymentWebhookInput;
}
