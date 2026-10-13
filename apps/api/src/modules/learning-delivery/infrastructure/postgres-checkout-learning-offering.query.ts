import { Injectable } from "@nestjs/common";
import type { DatabaseTransaction } from "@platform/database";

import { CheckoutLearningOfferingQuery } from "../application/checkout-learning-offering.query";

@Injectable()
export class PostgresCheckoutLearningOfferingQuery extends CheckoutLearningOfferingQuery {
  async lockSellableOffering(
    transaction: DatabaseTransaction,
    organizationId: string,
    offeringId: string
  ): Promise<boolean> {
    const result = await transaction.client.query<{ id: string }>(
      `SELECT id::text
         FROM learning_delivery.learning_offerings
        WHERE organization_id = $1
          AND id = $2
          AND status = 'open'
          AND access_mode = 'entitlement_required'
        FOR SHARE`,
      [organizationId, offeringId]
    );
    return result.rows[0] !== undefined;
  }
}
