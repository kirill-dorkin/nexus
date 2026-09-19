import type {
  CreatePurchaseCheckoutRequest,
  Purchase
} from "@platform/contracts";

export type PurchaseCheckoutSpecification = Readonly<{
  purchase: Purchase;
  productName: string;
}>;

export abstract class PurchaseCommand {
  abstract openForCheckout(
    organizationId: string,
    command: CreatePurchaseCheckoutRequest
  ): Promise<PurchaseCheckoutSpecification>;
}
