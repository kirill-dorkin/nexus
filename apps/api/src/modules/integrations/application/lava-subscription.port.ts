import { Injectable } from "@nestjs/common";
import type { SubscriptionBillingPeriod } from "@platform/contracts";
import type { DatabaseTransaction } from "@platform/database";

import { lavaOfferId } from "./lava-config";
import { LavaContractRepository } from "./lava-contract.repository";
import {
  LavaSubscriptionGateway,
  type LavaInvoiceInput
} from "./lava-subscription.gateway";

/** Public Integrations interface for subscription checkout with lava.top (ADR-0087 §5, §7). */
@Injectable()
export class LavaSubscriptionPort {
  constructor(
    private readonly gateway: LavaSubscriptionGateway,
    private readonly contracts: LavaContractRepository
  ) {}

  firstContract(
    transaction: DatabaseTransaction,
    organizationId: string,
    subscriptionId: string
  ) {
    return this.contracts.findFirstContract(
      transaction,
      organizationId,
      subscriptionId
    );
  }

  /** Outside any transaction: asks lava.top for the payment page of this price. */
  createInvoice(
    input: Readonly<{
      priceId: string;
      email: string;
      currency: string;
      billingPeriod: SubscriptionBillingPeriod;
      returnUrl: string;
      utm?: LavaInvoiceInput["utm"];
    }>
  ) {
    return this.gateway.createInvoice({
      email: input.email,
      offerId: lavaOfferId(input.priceId),
      currency: input.currency,
      billingPeriod: input.billingPeriod,
      returnUrl: input.returnUrl,
      ...(input.utm ? { utm: input.utm } : {})
    });
  }

  recordFirstContract(
    transaction: DatabaseTransaction,
    input: Parameters<LavaContractRepository["saveFirstContract"]>[1]
  ) {
    return this.contracts.saveFirstContract(transaction, input);
  }

  cancel(input: Readonly<{ parentContractId: string; email: string }>) {
    return this.gateway.cancelSubscription(input);
  }
}
