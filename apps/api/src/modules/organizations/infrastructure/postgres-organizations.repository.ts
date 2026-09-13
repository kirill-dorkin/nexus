import { Injectable } from "@nestjs/common";
import type { Organization } from "@platform/contracts";
import type { DatabaseTransaction } from "@platform/database";

import {
  OrganizationsRepository,
  type NewOrganization
} from "../application/organizations.repository";

type OrganizationRow = {
  id: string;
  slug: string;
  name: string;
  status: Organization["status"];
};

@Injectable()
export class PostgresOrganizationsRepository extends OrganizationsRepository {
  async createOrganization(
    transaction: DatabaseTransaction,
    organization: NewOrganization
  ): Promise<Organization> {
    await transaction.client.query(
      `INSERT INTO organizations.organizations
         (id, slug, name, created_by_user_id)
       VALUES ($1, $2, $3, $4)`,
      [
        organization.id,
        organization.slug,
        organization.name,
        organization.createdByUserId
      ]
    );

    return {
      id: organization.id,
      slug: organization.slug,
      name: organization.name,
      status: "active"
    };
  }

  async addActiveMembership(
    transaction: DatabaseTransaction,
    organizationId: string,
    userId: string
  ): Promise<void> {
    await transaction.client.query(
      `INSERT INTO organizations.memberships
         (organization_id, user_id, status, joined_at)
       VALUES ($1, $2, 'active', now())`,
      [organizationId, userId]
    );
  }

  async findById(
    transaction: DatabaseTransaction,
    organizationId: string
  ): Promise<Organization | null> {
    const result = await transaction.client.query<OrganizationRow>(
      `SELECT id::text, slug, name, status
         FROM organizations.organizations
        WHERE id = $1`,
      [organizationId]
    );
    const row = result.rows[0];

    if (row === undefined) {
      return null;
    }

    return {
      id: row.id,
      slug: row.slug,
      name: row.name,
      status: row.status
    };
  }
}
