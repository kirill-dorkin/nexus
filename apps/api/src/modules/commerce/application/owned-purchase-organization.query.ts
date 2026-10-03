import type { DatabaseTransaction } from "@platform/database";

export abstract class OwnedPurchaseOrganizationQuery {
  abstract resolve(
    transaction: DatabaseTransaction,
    purchaseId: string
  ): Promise<string | null>;
}
