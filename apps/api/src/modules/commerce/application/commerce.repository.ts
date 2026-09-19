import type {
  CommercePrice,
  CommerceProduct,
  Entitlement
} from "@platform/contracts";
import type { DatabaseTransaction } from "@platform/database";

export type CreateCommerceProduct = Readonly<{
  id: string;
  organizationId: string;
  offeringId: string;
  slug: string;
  name: string;
  createdByUserId: string;
}>;

export type CreateCommercePrice = Readonly<{
  id: string;
  organizationId: string;
  productId: string;
  amountMinor: number;
  currency: string;
  billingType: CommercePrice["billingType"];
  createdByUserId: string;
}>;

export type GrantOfferingEntitlement = Readonly<{
  id: string;
  organizationId: string;
  offeringId: string;
  userId: string;
  expiresAt: string | null;
  grantedByUserId: string;
}>;

export abstract class CommerceRepository {
  abstract createProduct(
    transaction: DatabaseTransaction,
    product: CreateCommerceProduct
  ): Promise<CommerceProduct>;

  abstract findProductById(
    transaction: DatabaseTransaction,
    organizationId: string,
    productId: string
  ): Promise<CommerceProduct | null>;

  abstract archiveProduct(
    transaction: DatabaseTransaction,
    organizationId: string,
    productId: string,
    archivedByUserId: string
  ): Promise<CommerceProduct | null>;

  abstract hasActivePrices(
    transaction: DatabaseTransaction,
    organizationId: string,
    productId: string
  ): Promise<boolean>;

  abstract createPrice(
    transaction: DatabaseTransaction,
    price: CreateCommercePrice
  ): Promise<CommercePrice>;

  abstract findPriceById(
    transaction: DatabaseTransaction,
    organizationId: string,
    priceId: string
  ): Promise<CommercePrice | null>;

  abstract archivePrice(
    transaction: DatabaseTransaction,
    organizationId: string,
    priceId: string,
    archivedByUserId: string
  ): Promise<CommercePrice | null>;

  abstract grantOfferingEntitlement(
    transaction: DatabaseTransaction,
    entitlement: GrantOfferingEntitlement
  ): Promise<Entitlement>;

  abstract findEntitlementById(
    transaction: DatabaseTransaction,
    organizationId: string,
    entitlementId: string
  ): Promise<Entitlement | null>;

  abstract findEffectiveOfferingEntitlement(
    transaction: DatabaseTransaction,
    organizationId: string,
    userId: string,
    offeringId: string
  ): Promise<Entitlement | null>;

  abstract revokeEntitlement(
    transaction: DatabaseTransaction,
    organizationId: string,
    entitlementId: string,
    revokedByUserId: string
  ): Promise<Entitlement | null>;
}
