import { Injectable } from "@nestjs/common";
import {
  customerEntryPolicySchema,
  type CustomerEntryPolicy
} from "@platform/contracts";
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
      `SELECT organization.slug,
              organization.name,
              organizations.find_public_customer_entry_policy_by_slug($1)
                AS customer_entry_policy
         FROM organizations.find_public_organization_by_slug($1) AS organization`,
      [slug]
    );
    const row = result.rows[0];
    return row === undefined
      ? null
      : {
          slug: row.slug,
          name: row.name,
          customerEntryPolicy: customerEntryPolicySchema.parse(
            row.customer_entry_policy
          )
        };
  }

  async resolveActiveId(
    transaction: DatabaseTransaction,
    slug: string
  ): Promise<string | null> {
    const result = await transaction.client.query<{ id: string | null }>(
      "SELECT organizations.resolve_active_public_organization_id($1)::text AS id",
      [slug]
    );
    return result.rows[0]?.id ?? null;
  }
}
