import { ConflictException, Injectable } from "@nestjs/common";

import { DatabaseService } from "../../../database/database.service";
import { RequestContextService } from "../../../request-context/request-context.service";
import {
  PaymentCheckoutGateway,
  type PaymentCheckout,
  type PaymentCheckoutRequest
} from "./payment-checkout.gateway";
import { PaymentCheckoutProvider } from "./payment-checkout.provider";
import { PaymentCheckoutRepository } from "./payment-checkout.repository";

const activePaymentProviderKey = "paddle" as const;

@Injectable()
export class PaymentCheckoutApplicationService extends PaymentCheckoutGateway {
  constructor(
    private readonly database: DatabaseService,
    private readonly requestContext: RequestContextService,
    private readonly checkouts: PaymentCheckoutRepository,
    private readonly provider: PaymentCheckoutProvider
  ) {
    super();
  }

  async createOrGetCheckout(
    request: PaymentCheckoutRequest
  ): Promise<PaymentCheckout> {
    const context = this.requestContext.tenantContext(request.organizationId);

    const existing = await this.database.tenantTransaction(
      context,
      (transaction) =>
        this.checkouts.findByPurchase(
          transaction,
          request.organizationId,
          request.purchaseId,
          activePaymentProviderKey
        )
    );
    if (existing !== null) {
      return {
        checkoutUrl: existing.checkoutUrl,
        expiresAt: existing.expiresAt?.toISOString() ?? null
      };
    }

    // External provider calls deliberately occur outside PostgreSQL transactions.
    // Paddle has no arbitrary create-idempotency key. The canonical Purchase and
    // persisted provider mapping arbitrate retries/concurrency; an ambiguous network
    // failure may leave an unused external draft transaction, never canonical state.
    const providerCheckout = await this.provider.createCheckout({
      organizationId: request.organizationId,
      purchaseId: request.purchaseId,
      productName: request.productName,
      amountMinor: request.amountMinor,
      currency: request.currency
    });

    try {
      return await this.database.tenantTransaction(
        context,
        async (transaction) => {
          const inserted = await this.checkouts.create(transaction, {
            organizationId: request.organizationId,
            purchaseId: request.purchaseId,
            providerKey: providerCheckout.providerKey,
            externalCheckoutId: providerCheckout.externalCheckoutId,
            checkoutUrl: providerCheckout.checkoutUrl,
            expiresAt: providerCheckout.expiresAt
          });
          const checkout =
            inserted ??
            (await this.checkouts.findByPurchase(
              transaction,
              request.organizationId,
              request.purchaseId,
              providerCheckout.providerKey
            ));
          if (checkout === null) {
            throw new ConflictException(
              "Payment checkout mapping could not be persisted."
            );
          }
          return {
            checkoutUrl: checkout.checkoutUrl,
            expiresAt: checkout.expiresAt?.toISOString() ?? null
          };
        }
      );
    } catch (error) {
      if (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        error.code === "23505"
      ) {
        throw new ConflictException(
          "Payment provider checkout identity is already bound to another Purchase."
        );
      }
      throw error;
    }
  }
}
