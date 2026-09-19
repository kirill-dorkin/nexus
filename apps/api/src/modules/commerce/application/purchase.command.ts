import type {
  CreatePurchaseCheckoutRequest,
  Purchase
} from "@platform/contracts";

export type PurchaseCheckoutSpecification = Readonly<{
  purchase: Purchase;
  productName: string;
}>;

export type PurchaseSettlement = Readonly<{
  organizationId: string;
  purchaseId: string;
  amountMinor: number;
  currency: string;
}>;

export abstract class PurchaseCommand {
  abstract openForCheckout(
    organizationId: string,
    command: CreatePurchaseCheckoutRequest
  ): Promise<PurchaseCheckoutSpecification>;

  abstract settlePaid(settlement: PurchaseSettlement): Promise<Purchase>;
}
