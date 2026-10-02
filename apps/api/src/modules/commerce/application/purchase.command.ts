import type {
  CreatePurchaseCheckoutRequest,
  Purchase
} from "@platform/contracts";
import type { DatabaseTransaction } from "@platform/database";

export type PurchaseCheckoutSpecification = Readonly<{
  purchase: Purchase;
  productName: string;
}>;

export abstract class PurchaseCommand {
  abstract openForCheckout(
    organizationId: string,
    command: CreatePurchaseCheckoutRequest
  ): Promise<PurchaseCheckoutSpecification>;

  abstract openForCheckoutInTransaction(
    transaction: DatabaseTransaction,
    organizationId: string,
    command: CreatePurchaseCheckoutRequest
  ): Promise<PurchaseCheckoutSpecification>;
}
