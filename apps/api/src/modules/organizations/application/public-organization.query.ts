import type { DatabaseTransaction } from "@platform/database";

export type PublicOrganization = Readonly<{
  id: string;
  slug: string;
  name: string;
}>;

export abstract class PublicOrganizationQuery {
  abstract findActiveBySlug(
    transaction: DatabaseTransaction,
    slug: string
  ): Promise<PublicOrganization | null>;
}
