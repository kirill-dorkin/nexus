import { Injectable } from "@nestjs/common";
import type { DatabaseTransaction } from "@platform/database";

import {
  PaymentCheckoutRepository,
  type PersistedPaymentCheckout
} from "../application/payment-checkout.repository";

type CheckoutRow = {
  organization_id: string;
  purchase_id: string;
  provider_key: string;
  external_checkout_id: string;
  checkout_url: string;
  expires_at: Date | null;
};

function mapCheckout(row: CheckoutRow): PersistedPaymentCheckout {
  return {
    organizationId: row.organization_id,
    purchaseId: row.purchase_id,
    providerKey: row.provider_key,
    externalCheckoutId: row.external_checkout_id,
    checkoutUrl: row.checkout_url,
    expiresAt: row.expires_at
  };
}

const checkoutSelect = `organization_id::text,
  purchase_id::text,
  provider_key,
  external_checkout_id,
  checkout_url,
  expires_at`;

@Injectable()
export class PostgresPaymentCheckoutRepository extends PaymentCheckoutRepository {
  async findByPurchase(
    transaction: DatabaseTransaction,
    organizationId: string,
    purchaseId: string,
    providerKey: string
  ): Promise<PersistedPaymentCheckout | null> {
    const result = await transaction.client.query<CheckoutRow>(
      `SELECT ${checkoutSelect}
         FROM integrations.payment_checkouts
        WHERE organization_id = $1
          AND purchase_id = $2
          AND provider_key = $3`,
      [organizationId, purchaseId, providerKey]
    );
    const row = result.rows[0];
    return row === undefined ? null : mapCheckout(row);
  }

  async create(
    transaction: DatabaseTransaction,
    checkout: PersistedPaymentCheckout
  ): Promise<PersistedPaymentCheckout | null> {
    const result = await transaction.client.query<CheckoutRow>(
      `INSERT INTO integrations.payment_checkouts (
         organization_id,
         purchase_id,
         provider_key,
         external_checkout_id,
         checkout_url,
         expires_at
       )
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (organization_id, purchase_id, provider_key)
       DO NOTHING
       RETURNING ${checkoutSelect}`,
      [
        checkout.organizationId,
        checkout.purchaseId,
        checkout.providerKey,
        checkout.externalCheckoutId,
        checkout.checkoutUrl,
        checkout.expiresAt
      ]
    );
    const row = result.rows[0];
    return row === undefined ? null : mapCheckout(row);
  }
}
