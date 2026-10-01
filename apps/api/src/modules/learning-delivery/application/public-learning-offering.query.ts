import type { LearningOffering } from "@platform/contracts";
import type { DatabaseTransaction } from "@platform/database";

export type PublicSellableOffering = Readonly<{
  id: string;
  slug: string;
  name: string;
  deliveryMode: LearningOffering["deliveryMode"];
  startsAt: string | null;
  endsAt: string | null;
}>;

export abstract class PublicLearningOfferingQuery {
  abstract listSellableByIds(
    transaction: DatabaseTransaction,
    organizationId: string,
    offeringIds: readonly string[]
  ): Promise<readonly PublicSellableOffering[]>;
}
