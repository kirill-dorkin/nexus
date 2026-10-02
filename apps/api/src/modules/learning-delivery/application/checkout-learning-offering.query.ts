import type { DatabaseTransaction } from "@platform/database";

export abstract class CheckoutLearningOfferingQuery {
  abstract lockSellableOffering(
    transaction: DatabaseTransaction,
    organizationId: string,
    offeringId: string
  ): Promise<boolean>;
}
