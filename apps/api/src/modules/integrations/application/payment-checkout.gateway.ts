export type PaymentCheckoutRequest = Readonly<{
  organizationId: string;
  purchaseId: string;
  productName: string;
  amountMinor: number;
  currency: string;
}>;

export type PaymentCheckout = Readonly<{
  checkoutUrl: string;
  expiresAt: string | null;
}>;

export abstract class PaymentCheckoutGateway {
  abstract createOrGetCheckout(
    request: PaymentCheckoutRequest
  ): Promise<PaymentCheckout>;
}
