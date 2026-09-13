import type { Organization } from "@platform/contracts";
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

  abstract findById(
    transaction: DatabaseTransaction,
    organizationId: string
  ): Promise<Organization | null>;
}
