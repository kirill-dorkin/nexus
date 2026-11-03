import { randomUUID } from "node:crypto";

import {
  withTransaction,
  type DatabasePool,
  type DatabaseTransaction
} from "@platform/database";

type ClaimRow = {
  inbox_id: string;
  provider_event_id: string;
  external_checkout_id: string;
  event_type: string;
  payment_status: "paid" | "unpaid" | "no_payment_required";
  amount_minor: number;
  currency: string;
  organization_id: string | null;
  purchase_id: string | null;
  attempt_count: number;
};

type Claim = Readonly<{
  inboxId: string;
  providerEventId: string;
  externalCheckoutId: string;
  eventType: string;
  paymentStatus: "paid" | "unpaid" | "no_payment_required";
  amountMinor: number;
  currency: string;
  organizationId: string | null;
  purchaseId: string | null;
  attemptCount: number;
}>;

export type PaymentWebhookProcessorOptions = Readonly<{
  leaseSeconds?: number;
  maxAttempts?: number;
  retryBaseMs?: number;
  retryMaxMs?: number;
}>;

export type PaymentWebhookCycle =
  | Readonly<{ kind: "idle" }>
  | Readonly<{
      kind: "completed";
      inboxId: string;
      purchaseId: string;
      paymentStatus: Claim["paymentStatus"];
    }>
  | Readonly<{
      kind: "blocked";
      inboxId: string;
      errorCode: "checkout_mapping_unavailable";
    }>
  | Readonly<{
      kind: "rejected";
      inboxId: string;
      errorCode: "settlement_mismatch";
    }>
  | Readonly<{
      kind: "retryable" | "dead_letter";
      inboxId: string;
      errorCode: "processor_failure";
    }>
  | Readonly<{
      kind: "lease_lost";
      inboxId: string;
    }>;

function postgresCode(error: unknown): string | null {
  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof error.code === "string"
  ) {
    return error.code;
  }
  return null;
}

export class PaymentWebhookProcessor {
  private readonly leaseSeconds: number;
  private readonly maxAttempts: number;
  private readonly retryBaseMs: number;
  private readonly retryMaxMs: number;

  constructor(
    private readonly pool: DatabasePool,
    options: PaymentWebhookProcessorOptions = {}
  ) {
    this.leaseSeconds = options.leaseSeconds ?? 60;
    this.maxAttempts = options.maxAttempts ?? 5;
    this.retryBaseMs = options.retryBaseMs ?? 1_000;
    this.retryMaxMs = options.retryMaxMs ?? 60_000;

    if (this.leaseSeconds < 1 || this.leaseSeconds > 900) {
      throw new Error("leaseSeconds must be between 1 and 900.");
    }
    if (this.maxAttempts < 1 || this.maxAttempts > 5) {
      throw new Error("maxAttempts must be between 1 and 5.");
    }
    if (this.retryBaseMs < 1 || this.retryMaxMs < this.retryBaseMs) {
      throw new Error("payment webhook retry bounds are invalid.");
    }
  }

  async processOne(): Promise<PaymentWebhookCycle> {
    const leaseToken = randomUUID();
    const claim = await withTransaction(this.pool, (transaction) =>
      this.claim(transaction, leaseToken)
    );
    if (claim === null) {
      return { kind: "idle" };
    }

    if (claim.organizationId === null || claim.purchaseId === null) {
      const finished = await this.finish(
        claim,
        leaseToken,
        "blocked",
        "checkout_mapping_unavailable",
        null
      );
      return finished
        ? {
            kind: "blocked",
            inboxId: claim.inboxId,
            errorCode: "checkout_mapping_unavailable"
          }
        : { kind: "lease_lost", inboxId: claim.inboxId };
    }

    try {
      const acknowledged = await withTransaction(
        this.pool,
        async (transaction) => {
          await transaction.client.query(
            "SELECT set_config('app.organization_id', $1, true)",
            [claim.organizationId]
          );
          const result = await transaction.client.query<{
            acknowledged: boolean;
          }>(
            `SELECT platform_internal.acknowledge_payment_webhook($1, $2)
             AS acknowledged`,
            [claim.inboxId, leaseToken]
          );
          return result.rows[0]?.acknowledged === true;
        }
      );

      return acknowledged
        ? {
            kind: "completed",
            inboxId: claim.inboxId,
            purchaseId: claim.purchaseId,
            paymentStatus: claim.paymentStatus
          }
        : { kind: "lease_lost", inboxId: claim.inboxId };
    } catch (error) {
      if (postgresCode(error) === "23514") {
        const finished = await this.finish(
          claim,
          leaseToken,
          "rejected",
          "settlement_mismatch",
          null
        );
        return finished
          ? {
              kind: "rejected",
              inboxId: claim.inboxId,
              errorCode: "settlement_mismatch"
            }
          : { kind: "lease_lost", inboxId: claim.inboxId };
      }

      const terminal = claim.attemptCount >= this.maxAttempts;
      const delay = Math.min(
        this.retryMaxMs,
        this.retryBaseMs *
          2 ** Math.max(0, Math.min(claim.attemptCount - 1, 10))
      );
      const kind = terminal ? "dead_letter" : "retryable";
      const finished = await this.finish(
        claim,
        leaseToken,
        kind,
        "processor_failure",
        terminal ? null : new Date(Date.now() + delay)
      );
      return finished
        ? { kind, inboxId: claim.inboxId, errorCode: "processor_failure" }
        : { kind: "lease_lost", inboxId: claim.inboxId };
    }
  }

  private async claim(
    transaction: DatabaseTransaction,
    leaseToken: string
  ): Promise<Claim | null> {
    const result = await transaction.client.query<ClaimRow>(
      `SELECT
         inbox_id::text,
         provider_event_id,
         external_checkout_id,
         event_type,
         payment_status,
         amount_minor,
         currency,
         organization_id::text,
         purchase_id::text,
         attempt_count
       FROM platform_internal.claim_payment_webhook($1, $2)`,
      [leaseToken, this.leaseSeconds]
    );
    const row = result.rows[0];
    if (row === undefined) {
      return null;
    }
    return {
      inboxId: row.inbox_id,
      providerEventId: row.provider_event_id,
      externalCheckoutId: row.external_checkout_id,
      eventType: row.event_type,
      paymentStatus: row.payment_status,
      amountMinor: row.amount_minor,
      currency: row.currency,
      organizationId: row.organization_id,
      purchaseId: row.purchase_id,
      attemptCount: row.attempt_count
    };
  }

  private async finish(
    claim: Claim,
    leaseToken: string,
    outcome: "blocked" | "retryable" | "rejected" | "dead_letter",
    errorCode: string,
    availableAt: Date | null
  ): Promise<boolean> {
    return withTransaction(this.pool, async (transaction) => {
      const result = await transaction.client.query<{ finished: boolean }>(
        `SELECT platform_internal.finish_payment_webhook(
           $1, $2, $3, $4, $5
         ) AS finished`,
        [claim.inboxId, leaseToken, outcome, errorCode, availableAt]
      );
      return result.rows[0]?.finished === true;
    });
  }
}
