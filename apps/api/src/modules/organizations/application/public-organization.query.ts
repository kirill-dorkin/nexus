import type { CustomerEntryPolicy } from "@platform/contracts";
import type { DatabaseTransaction } from "@platform/database";

export type PublicOrganization = Readonly<{
  slug: string;
  name: string;
  customerEntryPolicy: CustomerEntryPolicy;
}>;

export abstract class PublicOrganizationQuery {
  abstract findActiveBySlug(
    transaction: DatabaseTransaction,
    slug: string
  ): Promise<PublicOrganization | null>;

  /** The id of an active Organization, for writes a public page may make (ADR-0085). */
  abstract resolveActiveId(
    transaction: DatabaseTransaction,
    slug: string
  ): Promise<string | null>;
}
