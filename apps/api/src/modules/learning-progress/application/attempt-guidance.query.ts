import type { Attempt, Submission } from "@platform/contracts";
import type { DatabaseTransaction } from "@platform/database";

export type AttemptGuidanceContext = Readonly<{
  attempt: Attempt;
  offeringId: string;
  learnerUserId: string;
  submission: Submission | null;
}>;

export abstract class AttemptGuidanceQuery {
  abstract requireAttemptGuidanceContext(
    transaction: DatabaseTransaction,
    organizationId: string,
    attemptId: string
  ): Promise<AttemptGuidanceContext>;
}
