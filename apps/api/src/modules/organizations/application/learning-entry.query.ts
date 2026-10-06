import type { DatabaseTransaction } from "@platform/database";
export type LearningEntryContext = Readonly<{
  slug: string;
  name: string;
  customerEntryPolicy: "open" | "closed";
  membershipStatus: "none" | "active" | "invited" | "suspended" | "left";
}>;
export abstract class LearningEntryQuery {
  abstract read(
    tx: DatabaseTransaction,
    organizationId: string,
    userId: string,
    lock?: boolean
  ): Promise<LearningEntryContext | null>;
}
