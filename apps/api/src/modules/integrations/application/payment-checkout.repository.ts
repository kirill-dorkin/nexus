import type { DatabaseTransaction } from "@platform/database";

export type PersistedPaymentCheckout = Readonly<{
  organizationId: string;
  purchaseId: string;
  providerKey: string;
  externalCheckoutId: string;
  checkoutUrl: string;
  expiresAt: Date | null;
}>;

export abstract class PaymentCheckoutRepository {
  abstract findByPurchase(
    transaction: DatabaseTransaction,
    organizationId: string,
    purchaseId: string,
    providerKey: string
  ): Promise<PersistedPaymentCheckout | null>;

  abstract create(
    transaction: DatabaseTransaction,
    checkout: PersistedPaymentCheckout
  ): Promise<PersistedPaymentCheckout | null>;
}
