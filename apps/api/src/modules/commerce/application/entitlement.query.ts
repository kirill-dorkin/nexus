import type { Entitlement } from "@platform/contracts";
import type { DatabaseTransaction } from "@platform/database";

export abstract class EntitlementQuery {
  abstract requireEffectiveOfferingEntitlement(
    transaction: DatabaseTransaction,
    organizationId: string,
    userId: string,
    offeringId: string
  ): Promise<Entitlement>;
}
