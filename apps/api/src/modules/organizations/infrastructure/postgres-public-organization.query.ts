import { Injectable } from "@nestjs/common";
import type { DatabaseTransaction } from "@platform/database";

import {
  PublicOrganizationQuery,
  type PublicOrganization
} from "../application/public-organization.query";

type PublicOrganizationRow = {
  id: string;
  slug: string;
  name: string;
};

@Injectable()
export class PostgresPublicOrganizationQuery extends PublicOrganizationQuery {
  async findActiveBySlug(
    transaction: DatabaseTransaction,
    slug: string
  ): Promise<PublicOrganization | null> {
    const result = await transaction.client.query<PublicOrganizationRow>(
      `SELECT id::text, slug, name
         FROM organizations.find_public_organization_by_slug($1)`,
      [slug]
    );
    const row = result.rows[0];
    return row === undefined
      ? null
      : {
          id: row.id,
          slug: row.slug,
          name: row.name
        };
  }
}
