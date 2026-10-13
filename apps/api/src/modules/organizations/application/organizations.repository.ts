import type {
  CustomerEntryPolicy,
  Organization,
  OrganizationMembership
} from "@platform/contracts";
import type { DatabaseTransaction } from "@platform/database";

export type NewOrganization = Readonly<{
  id: string;
  slug: string;
  name: string;
  createdByUserId: string;
}>;

export type CustomerMembershipEntryResult =
  | Readonly<{
      outcome: "active";
      membership: OrganizationMembership;
    }>
  | Readonly<{
      outcome: "blocked" | "unavailable";
      membership: null;
    }>;

export abstract class OrganizationsRepository {
  abstract createOrganization(
    transaction: DatabaseTransaction,
    organization: NewOrganization
  ): Promise<Organization>;

  abstract addActiveMembership(
    transaction: DatabaseTransaction,
    organizationId: string,
    userId: string
  ): Promise<void>;

  abstract inviteMembership(
    transaction: DatabaseTransaction,
    organizationId: string,
    userId: string
  ): Promise<OrganizationMembership | null>;

  abstract activateInvitedMembership(
    transaction: DatabaseTransaction,
    organizationId: string,
    userId: string
  ): Promise<OrganizationMembership | null>;

  abstract suspendActiveMembership(
    transaction: DatabaseTransaction,
    organizationId: string,
    userId: string
  ): Promise<OrganizationMembership | null>;

  abstract leaveMembership(
    transaction: DatabaseTransaction,
    organizationId: string,
    userId: string
  ): Promise<OrganizationMembership | null>;

  abstract findMembership(
    transaction: DatabaseTransaction,
    organizationId: string,
    userId: string
  ): Promise<OrganizationMembership | null>;

  abstract updateCustomerEntryPolicy(
    transaction: DatabaseTransaction,
    organizationId: string,
    policy: CustomerEntryPolicy
  ): Promise<CustomerEntryPolicy | null>;

  abstract joinOpenCustomerOrganization(
    transaction: DatabaseTransaction,
    organizationSlug: string
  ): Promise<CustomerMembershipEntryResult>;

  abstract findById(
    transaction: DatabaseTransaction,
    organizationId: string
  ): Promise<Organization | null>;
}
