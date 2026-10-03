import type { DatabaseTransaction } from "@platform/database";

export type CheckoutCommerceOffer = Readonly<{
  productId: string;
  priceId: string;
  offeringId: string;
}>;

export abstract class CheckoutCommerceOfferQuery {
  abstract resolveActiveOffer(
    transaction: DatabaseTransaction,
    organizationId: string,
    productSlug: string,
    priceId: string
  ): Promise<CheckoutCommerceOffer | null>;
}
