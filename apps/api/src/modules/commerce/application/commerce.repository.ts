import type { Entitlement } from "@platform/contracts";
import type { DatabaseTransaction } from "@platform/database";

export type GrantOfferingEntitlement = Readonly<{
  id: string;
  organizationId: string;
  offeringId: string;
  userId: string;
  expiresAt: string | null;
  grantedByUserId: string;
}>;

export abstract class CommerceRepository {
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
