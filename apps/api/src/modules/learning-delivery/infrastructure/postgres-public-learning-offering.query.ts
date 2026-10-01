import { Injectable } from "@nestjs/common";
import type { LearningOffering } from "@platform/contracts";
import type { DatabaseTransaction } from "@platform/database";

import {
  PublicLearningOfferingQuery,
  type PublicSellableOffering
} from "../application/public-learning-offering.query";

type PublicOfferingRow = {
  id: string;
  slug: string;
  name: string;
  delivery_mode: LearningOffering["deliveryMode"];
  starts_at: Date | null;
  ends_at: Date | null;
};

@Injectable()
export class PostgresPublicLearningOfferingQuery extends PublicLearningOfferingQuery {
  async listSellableByIds(
    transaction: DatabaseTransaction,
    organizationId: string,
    offeringIds: readonly string[]
  ): Promise<readonly PublicSellableOffering[]> {
    if (offeringIds.length === 0) {
      return [];
    }

    const result = await transaction.client.query<PublicOfferingRow>(
      `SELECT id::text,
              slug,
              name,
              delivery_mode,
              starts_at,
              ends_at
         FROM learning_delivery.list_public_sellable_offerings($1, $2::uuid[])`,
      [organizationId, [...offeringIds]]
    );

    return result.rows.map((row) => ({
      id: row.id,
      slug: row.slug,
      name: row.name,
      deliveryMode: row.delivery_mode,
      startsAt: row.starts_at?.toISOString() ?? null,
      endsAt: row.ends_at?.toISOString() ?? null
    }));
  }
}
