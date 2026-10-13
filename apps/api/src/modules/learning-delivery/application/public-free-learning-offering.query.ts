import type { DatabaseTransaction } from "@platform/database";
export type PublicLearningAddress = {
  organizationSlug: string;
  offeringSlug: string;
  offeringName: string;
};
export abstract class PublicFreeLearningOfferingQuery {
  abstract listAddresses(
    tx: DatabaseTransaction
  ): Promise<readonly PublicLearningAddress[]>;
  abstract findOffering(
    tx: DatabaseTransaction,
    organizationSlug: string,
    offeringSlug: string
  ): Promise<{ slug: string; name: string } | null>;
}
