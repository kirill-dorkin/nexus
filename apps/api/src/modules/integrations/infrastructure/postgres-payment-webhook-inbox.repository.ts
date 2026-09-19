import { Injectable } from "@nestjs/common";
import type { DatabaseTransaction } from "@platform/database";

import {
  PaymentWebhookInboxRepository,
  type AcceptedPaymentWebhook,
  type PaymentWebhookInput,
  type PaymentWebhookRoutingStatus
} from "../application/payment-webhook-inbox.repository";

type IngestRow = {
  inserted: boolean;
  routing_status: PaymentWebhookRoutingStatus;
  existing_payload_sha256: string | null;
};

@Injectable()
export class PostgresPaymentWebhookInboxRepository extends PaymentWebhookInboxRepository {
  async accept(
    transaction: DatabaseTransaction,
    input: PaymentWebhookInput
  ): Promise<AcceptedPaymentWebhook> {
    const result = await transaction.client.query<IngestRow>(
      `SELECT
         inserted,
         routing_status,
         existing_payload_sha256
       FROM platform_internal.ingest_payment_webhook(
         $1::text,
         $2::text,
         $3::text,
         $4::text,
         $5::text,
         $6::integer,
         $7::text,
         $8::text
       )`,
      [
        input.providerKey,
        input.providerEventId,
        input.externalCheckoutId,
        input.eventType,
        input.paymentStatus,
        input.amountMinor,
        input.currency,
        input.payloadSha256
      ]
    );
    const row = result.rows[0];
    if (row === undefined) {
      throw new Error("Payment webhook inbox ingest returned no result.");
    }
    return {
      inserted: row.inserted,
      receivedRoutingStatus: row.routing_status,
      existingPayloadSha256: row.existing_payload_sha256
    };
  }
}
