export type CreateProviderCheckoutInput = Readonly<{
  organizationId: string;
  purchaseId: string;
  productName: string;
  amountMinor: number;
  currency: string;
}>;

export type ProviderCheckout = Readonly<{
  providerKey: "paddle";
  externalCheckoutId: string;
  checkoutUrl: string;
  expiresAt: Date | null;
}>;

export abstract class PaymentCheckoutProvider {
  abstract createCheckout(
    input: CreateProviderCheckoutInput
  ): Promise<ProviderCheckout>;
}
