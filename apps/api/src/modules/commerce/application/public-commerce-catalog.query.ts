import type { CommercePrice } from "@platform/contracts";
import type { DatabaseTransaction } from "@platform/database";

export type PublicCommercePrice = Readonly<{
  id: string;
  amountMinor: number;
  currency: string;
  billingType: CommercePrice["billingType"];
}>;

export type PublicCommerceProductCandidate = Readonly<{
  id: string;
  offeringId: string;
  slug: string;
  name: string;
  prices: readonly PublicCommercePrice[];
}>;

export abstract class PublicCommerceCatalogQuery {
  abstract listActiveProductCandidates(
    transaction: DatabaseTransaction,
    organizationId: string,
    productSlug?: string
  ): Promise<readonly PublicCommerceProductCandidate[]>;
}
