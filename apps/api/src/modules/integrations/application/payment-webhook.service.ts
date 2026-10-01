import { ConflictException, Injectable } from "@nestjs/common";

import { DatabaseService } from "../../../database/database.service";
import { PaddlePaymentWebhookVerifier } from "../infrastructure/paddle-payment-webhook.verifier";
import { PaymentWebhookInboxRepository } from "./payment-webhook-inbox.repository";

@Injectable()
export class PaymentWebhookApplicationService {
  constructor(
    private readonly database: DatabaseService,
    private readonly inbox: PaymentWebhookInboxRepository,
    private readonly verifier: PaddlePaymentWebhookVerifier
  ) {}

  async receivePaddle(
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
        "Paddle event id was already accepted with different content."
      );
    }
  }
}
