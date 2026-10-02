import type { DatabaseTransaction } from "@platform/database";

export type CheckoutOrganization = Readonly<{
  id: string;
  slug: string;
}>;

export abstract class CheckoutOrganizationQuery {
  abstract resolveActiveMemberBySlug(
    transaction: DatabaseTransaction,
    organizationSlug: string
  ): Promise<CheckoutOrganization | null>;

  abstract lockActiveMembership(
    transaction: DatabaseTransaction,
    organizationId: string,
    userId: string
  ): Promise<boolean>;
}
