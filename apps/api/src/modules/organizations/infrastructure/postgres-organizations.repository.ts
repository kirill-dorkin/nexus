import { Injectable } from "@nestjs/common";
import type {
  Organization,
  OrganizationMembership,
  OrganizationMembershipStatus
} from "@platform/contracts";
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

type MembershipRow = {
  id: string;
  organization_id: string;
  user_id: string;
  status: OrganizationMembershipStatus;
  joined_at: Date | null;
};

function mapMembership(row: MembershipRow): OrganizationMembership {
  return {
    id: row.id,
    organizationId: row.organization_id,
    userId: row.user_id,
    status: row.status,
    joinedAt: row.joined_at?.toISOString() ?? null
  };
}

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

  async inviteMembership(
    transaction: DatabaseTransaction,
    organizationId: string,
    userId: string
  ): Promise<OrganizationMembership | null> {
    const result = await transaction.client.query<MembershipRow>(
      `INSERT INTO organizations.memberships
         (organization_id, user_id, status, joined_at)
       VALUES ($1, $2, 'invited', NULL)
       ON CONFLICT (organization_id, user_id)
       DO UPDATE
          SET status = 'invited',
              joined_at = NULL,
              updated_at = now()
        WHERE organizations.memberships.status = 'left'
       RETURNING id::text,
                 organization_id::text,
                 user_id::text,
                 status,
                 joined_at`,
      [organizationId, userId]
    );
    const row = result.rows[0];
    return row === undefined ? null : mapMembership(row);
  }

  async activateInvitedMembership(
    transaction: DatabaseTransaction,
    organizationId: string,
    userId: string
  ): Promise<OrganizationMembership | null> {
    return this.updateMembershipStatus(
      transaction,
      organizationId,
      userId,
      "invited",
      "active",
      true
    );
  }

  async suspendActiveMembership(
    transaction: DatabaseTransaction,
    organizationId: string,
    userId: string
  ): Promise<OrganizationMembership | null> {
    return this.updateMembershipStatus(
      transaction,
      organizationId,
      userId,
      "active",
      "suspended",
      false
    );
  }

  async leaveMembership(
    transaction: DatabaseTransaction,
    organizationId: string,
    userId: string
  ): Promise<OrganizationMembership | null> {
    const result = await transaction.client.query<MembershipRow>(
      `UPDATE organizations.memberships
          SET status = 'left',
              updated_at = now()
        WHERE organization_id = $1
          AND user_id = $2
          AND status IN ('invited', 'active')
       RETURNING id::text,
                 organization_id::text,
                 user_id::text,
                 status,
                 joined_at`,
      [organizationId, userId]
    );
    const row = result.rows[0];
    return row === undefined ? null : mapMembership(row);
  }

  async findMembership(
    transaction: DatabaseTransaction,
    organizationId: string,
    userId: string
  ): Promise<OrganizationMembership | null> {
    const result = await transaction.client.query<MembershipRow>(
      `SELECT id::text,
              organization_id::text,
              user_id::text,
              status,
              joined_at
         FROM organizations.memberships
        WHERE organization_id = $1
          AND user_id = $2`,
      [organizationId, userId]
    );
    const row = result.rows[0];
    return row === undefined ? null : mapMembership(row);
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

  private async updateMembershipStatus(
    transaction: DatabaseTransaction,
    organizationId: string,
    userId: string,
    currentStatus: OrganizationMembershipStatus,
    nextStatus: OrganizationMembershipStatus,
    setJoinedAt: boolean
  ): Promise<OrganizationMembership | null> {
    const result = await transaction.client.query<MembershipRow>(
      `UPDATE organizations.memberships
          SET status = $4,
              joined_at = CASE WHEN $5::boolean THEN now() ELSE joined_at END,
              updated_at = now()
        WHERE organization_id = $1
          AND user_id = $2
          AND status = $3
       RETURNING id::text,
                 organization_id::text,
                 user_id::text,
                 status,
                 joined_at`,
      [organizationId, userId, currentStatus, nextStatus, setJoinedAt]
    );
    const row = result.rows[0];
    return row === undefined ? null : mapMembership(row);
  }
}
