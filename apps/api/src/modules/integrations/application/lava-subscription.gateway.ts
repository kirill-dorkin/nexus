import type { SubscriptionBillingPeriod } from "@platform/contracts";

export type LavaInvoiceInput = Readonly<{
  email: string;
  offerId: string;
  currency: string;
  billingPeriod: SubscriptionBillingPeriod;
  returnUrl: string;
  utm?: Readonly<{
    source?: string | undefined;
    medium?: string | undefined;
    campaign?: string | undefined;
  }>;
}>;

/** The lava.top API as the platform uses it (ADR-0087 §5, §7). Calls happen outside transactions. */
export abstract class LavaSubscriptionGateway {
  /** POST /api/v3/invoice: a contract id and the payment page for the first payment. */
  abstract createInvoice(
    input: LavaInvoiceInput
  ): Promise<{ contractId: string; paymentUrl: string }>;

  /** DELETE /api/v1/subscriptions: no further charges. */
  abstract cancelSubscription(
    input: Readonly<{ parentContractId: string; email: string }>
  ): Promise<void>;
}
