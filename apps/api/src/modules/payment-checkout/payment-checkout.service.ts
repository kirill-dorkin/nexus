import { Injectable } from "@nestjs/common";
import {
  purchaseCheckoutSchema,
  type CreatePurchaseCheckoutRequest,
  type PurchaseCheckout
} from "@platform/contracts";

import { PaymentCheckoutGateway } from "../integrations/application/payment-checkout.gateway";
import { PurchaseCommand } from "../commerce/application/purchase.command";

@Injectable()
export class PurchaseCheckoutApplicationService {
  constructor(
    private readonly purchases: PurchaseCommand,
    private readonly payments: PaymentCheckoutGateway
  ) {}

  async createOrGetCheckout(
    organizationId: string,
    command: CreatePurchaseCheckoutRequest
  ): Promise<PurchaseCheckout> {
    const specification = await this.purchases.openForCheckout(
      organizationId,
      command
    );
    const checkout = await this.payments.createOrGetCheckout({
      organizationId,
      purchaseId: specification.purchase.id,
      productName: specification.productName,
      amountMinor: specification.purchase.amountMinor,
      currency: specification.purchase.currency
    });

    return purchaseCheckoutSchema.parse({
      purchase: specification.purchase,
      checkoutUrl: checkout.checkoutUrl,
      checkoutExpiresAt: checkout.expiresAt
    });
  }
}
