import { Injectable } from "@nestjs/common";
import type { DatabaseTransaction } from "@platform/database";

import {
  CheckoutOrganizationQuery,
  type CheckoutOrganization
} from "../application/checkout-organization.query";

type CheckoutOrganizationRow = {
  organization_id: string;
  slug: string;
};

@Injectable()
export class PostgresCheckoutOrganizationQuery extends CheckoutOrganizationQuery {
  async resolveActiveMemberBySlug(
    transaction: DatabaseTransaction,
    organizationSlug: string
  ): Promise<CheckoutOrganization | null> {
    const result = await transaction.client.query<CheckoutOrganizationRow>(
      `SELECT organization_id::text, slug
         FROM organizations.resolve_checkout_organization($1)`,
      [organizationSlug]
    );
    const row = result.rows[0];
    return row === undefined
      ? null
      : { id: row.organization_id, slug: row.slug };
  }

  async lockActiveMembership(
    transaction: DatabaseTransaction,
    organizationId: string,
    userId: string
  ): Promise<boolean> {
    const result = await transaction.client.query<{ organization_id: string }>(
      `SELECT organization.id::text AS organization_id
         FROM organizations.organizations AS organization
         JOIN organizations.memberships AS membership
           ON membership.organization_id = organization.id
        WHERE organization.id = $1
          AND organization.status = 'active'
          AND membership.user_id = $2
          AND membership.status = 'active'
        FOR SHARE OF organization, membership`,
      [organizationId, userId]
    );
    return result.rows[0] !== undefined;
  }
}
