import type {
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

  abstract findById(
    transaction: DatabaseTransaction,
    organizationId: string
  ): Promise<Organization | null>;
}
