import type { CommercePrice } from "@platform/contracts";
import type { DatabaseTransaction } from "@platform/database";

export type PublicCommercePrice = Readonly<{
  id: string;
  amountMinor: number;
  currency: string;
  billingType: CommercePrice["billingType"];
}>;

export type PublicCommerceProductCandidate = Readonly<{
  offeringId: string;
  slug: string;
  name: string;
  prices: readonly PublicCommercePrice[];
}>;

export abstract class PublicCommerceCatalogQuery {
  abstract listActiveProductCandidates(
    transaction: DatabaseTransaction,
    organizationSlug: string,
    productSlug?: string
  ): Promise<readonly PublicCommerceProductCandidate[]>;
}
