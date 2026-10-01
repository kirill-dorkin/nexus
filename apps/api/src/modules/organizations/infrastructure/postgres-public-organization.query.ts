import { Injectable } from "@nestjs/common";
import type { CustomerEntryPolicy } from "@platform/contracts";
import type { DatabaseTransaction } from "@platform/database";

import {
  PublicOrganizationQuery,
  type PublicOrganization
} from "../application/public-organization.query";

type PublicOrganizationRow = {
  slug: string;
  name: string;
  customer_entry_policy: CustomerEntryPolicy;
};

@Injectable()
export class PostgresPublicOrganizationQuery extends PublicOrganizationQuery {
  async findActiveBySlug(
    transaction: DatabaseTransaction,
    slug: string
  ): Promise<PublicOrganization | null> {
    const result = await transaction.client.query<PublicOrganizationRow>(
      `SELECT slug, name, customer_entry_policy
         FROM organizations.find_public_organization_by_slug($1)`,
      [slug]
    );
    const row = result.rows[0];
    return row === undefined
      ? null
      : {
          slug: row.slug,
          name: row.name,
          customerEntryPolicy: row.customer_entry_policy
        };
  }
}
