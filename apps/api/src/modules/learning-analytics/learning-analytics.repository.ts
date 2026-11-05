import type { DatabaseTransaction } from "@platform/database";
import type { LearningStepName } from "@platform/contracts";

export type LessonAddress = Readonly<{
  organizationSlug: string;
  offeringSlug: string;
  lessonSlug: string;
}>;

/** Writes go through validating SECURITY DEFINER functions (migration 000053). */
export abstract class LearningAnalyticsRepository {
  /** False when the address is not a lesson of a public Offering. */
  abstract recordStep(
    tx: DatabaseTransaction,
    address: LessonAddress,
    step: LearningStepName
  ): Promise<boolean>;
  abstract recordActiveTime(
    tx: DatabaseTransaction,
    address: LessonAddress,
    userId: string | null,
    seconds: number
  ): Promise<boolean>;
}

export class PostgresLearningAnalyticsRepository extends LearningAnalyticsRepository {
  async recordStep(
    tx: DatabaseTransaction,
    address: LessonAddress,
    step: LearningStepName
  ): Promise<boolean> {
    const result = await tx.client.query<{ recorded: boolean }>(
      "SELECT analytics.record_lesson_step($1, $2, $3, $4) AS recorded",
      [address.organizationSlug, address.offeringSlug, address.lessonSlug, step]
    );
    return result.rows[0]?.recorded === true;
  }

  async recordActiveTime(
    tx: DatabaseTransaction,
    address: LessonAddress,
    userId: string | null,
    seconds: number
  ): Promise<boolean> {
    const result = await tx.client.query<{ recorded: boolean }>(
      "SELECT analytics.record_active_time($1, $2, $3, $4, $5) AS recorded",
      [
        address.organizationSlug,
        address.offeringSlug,
        address.lessonSlug,
        userId,
        seconds
      ]
    );
    return result.rows[0]?.recorded === true;
  }
}
