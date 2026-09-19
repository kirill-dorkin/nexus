import {
  ConflictException,
  Injectable,
  ServiceUnavailableException
} from "@nestjs/common";

import { DatabaseService } from "../../../database/database.service";
import { PurchaseCommand } from "../../commerce/application/purchase.command";
import { StripePaymentWebhookVerifier } from "../infrastructure/stripe-payment-webhook.verifier";
import { PaymentWebhookInboxRepository } from "./payment-webhook-inbox.repository";

@Injectable()
export class PaymentWebhookApplicationService {
  constructor(
    private readonly database: DatabaseService,
    private readonly inbox: PaymentWebhookInboxRepository,
    private readonly verifier: StripePaymentWebhookVerifier,
    private readonly purchases: PurchaseCommand
  ) {}

  async receiveStripe(
    rawBody: Buffer,
    signature: string | undefined
  ): Promise<void> {
    const event = this.verifier.verify(rawBody, signature);

    const accepted = await this.database.transaction((transaction) =>
      this.inbox.accept(transaction, event)
    );
    if (
      !accepted.inserted &&
      accepted.existingPayloadSha256 !== event.payloadSha256
    ) {
      throw new ConflictException(
        "Stripe event id was already accepted with different content."
      );
    }

    // The immutable inbox records receive-time routing. A Checkout Session may
    // be created at Stripe just before its Nexus mapping commits, so retries
    // re-resolve the exact external checkout id against current trusted mapping.
    const route = await this.database.transaction((transaction) =>
      this.inbox.resolveCheckout(
        transaction,
        event.providerKey,
        event.externalCheckoutId
      )
    );
    if (route === null) {
      throw new ServiceUnavailableException(
        "Stripe Checkout mapping is not available yet; retry the webhook."
      );
    }

    if (event.paymentStatus !== "paid") {
      return;
    }

    await this.purchases.settlePaid({
      organizationId: route.organizationId,
      purchaseId: route.purchaseId,
      amountMinor: event.amountMinor,
      currency: event.currency
    });
  }
}
