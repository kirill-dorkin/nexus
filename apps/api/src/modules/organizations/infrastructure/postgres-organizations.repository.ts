import { Injectable } from "@nestjs/common";
import type {
  CustomerEntryPolicy,
  Organization,
  OrganizationMembership,
  OrganizationMembershipStatus
} from "@platform/contracts";
import type { DatabaseTransaction } from "@platform/database";

import {
  OrganizationsRepository,
  type CustomerMembershipEntryResult,
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

type CustomerEntryPolicyRow = {
  customer_entry_policy: CustomerEntryPolicy;
};

type CustomerMembershipEntryRow = {
  outcome: "active" | "blocked" | "unavailable";
  membership_id: string | null;
  organization_id: string | null;
  user_id: string | null;
  membership_status: OrganizationMembershipStatus | null;
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

  async updateCustomerEntryPolicy(
    transaction: DatabaseTransaction,
    organizationId: string,
    policy: CustomerEntryPolicy
  ): Promise<CustomerEntryPolicy | null> {
    const result = await transaction.client.query<CustomerEntryPolicyRow>(
      `UPDATE organizations.organizations
          SET customer_entry_policy = $2,
              updated_at = now()
        WHERE id = $1
       RETURNING customer_entry_policy`,
      [organizationId, policy]
    );
    return result.rows[0]?.customer_entry_policy ?? null;
  }

  async joinOpenCustomerOrganization(
    transaction: DatabaseTransaction,
    organizationSlug: string
  ): Promise<CustomerMembershipEntryResult> {
    const result = await transaction.client.query<CustomerMembershipEntryRow>(
      `SELECT outcome,
              membership_id::text,
              organization_id::text,
              user_id::text,
              membership_status,
              joined_at
         FROM organizations.join_open_customer_organization($1)`,
      [organizationSlug]
    );
    const row = result.rows[0];
    if (row === undefined || row.outcome === "unavailable") {
      return { outcome: "unavailable", membership: null };
    }
    if (row.outcome === "blocked") {
      return { outcome: "blocked", membership: null };
    }
    if (
      row.membership_id === null ||
      row.organization_id === null ||
      row.user_id === null ||
      row.membership_status !== "active" ||
      row.joined_at === null
    ) {
      throw new Error("Customer membership entry returned an invalid active membership.");
    }

    return {
      outcome: "active",
      membership: {
        id: row.membership_id,
        organizationId: row.organization_id,
        userId: row.user_id,
        status: row.membership_status,
        joinedAt: row.joined_at.toISOString()
      }
    };
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
