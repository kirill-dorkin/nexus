import { ConflictException, Injectable } from "@nestjs/common";

import { DatabaseService } from "../../../database/database.service";
import { PaymentWebhookInboxRepository } from "./payment-webhook-inbox.repository";
import { PaymentWebhookVerifier } from "./payment-webhook.verifier";

@Injectable()
export class PaymentWebhookApplicationService {
  constructor(
    private readonly database: DatabaseService,
    private readonly inbox: PaymentWebhookInboxRepository,
    private readonly verifier: PaymentWebhookVerifier
  ) {}

  async receive(
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
        "Payment provider event id was already accepted with different content."
      );
    }
  }
}
