import type { DatabaseTransaction } from "@platform/database";

export type ActivityAttemptCount = Readonly<{
  activityVersionId: string;
  attemptCount: number;
}>;

export abstract class LearningProgressQuery {
  abstract listActivityAttemptCounts(
    transaction: DatabaseTransaction,
    organizationId: string,
    enrollmentId: string,
    activityVersionIds: readonly string[]
  ): Promise<readonly ActivityAttemptCount[]>;
}
