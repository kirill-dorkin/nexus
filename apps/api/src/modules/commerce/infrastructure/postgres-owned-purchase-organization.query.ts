import { Injectable } from "@nestjs/common";
import type { DatabaseTransaction } from "@platform/database";

import { OwnedPurchaseOrganizationQuery } from "../application/owned-purchase-organization.query";

@Injectable()
export class PostgresOwnedPurchaseOrganizationQuery extends OwnedPurchaseOrganizationQuery {
  async resolve(
    transaction: DatabaseTransaction,
    purchaseId: string
  ): Promise<string | null> {
    const result = await transaction.client.query<{ organization_id: string }>(
      `SELECT organization_id::text
         FROM commerce.resolve_owned_purchase_organization($1::uuid)`,
      [purchaseId]
    );
    return result.rows[0]?.organization_id ?? null;
  }
}
