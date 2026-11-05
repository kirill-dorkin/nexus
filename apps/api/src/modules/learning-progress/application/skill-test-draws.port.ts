import type { DatabaseTransaction } from "@platform/database";

/** One stored draw of a skill test (ADR-0075, `learning_progress.skill_test_draws`). */
export type SkillTestDraw = Readonly<{
  id: string;
  organizationId: string;
  enrollmentId: string;
  activityVersionId: string;
  questionKeys: readonly string[];
  drawnAt: string;
  attemptId: string | null;
}>;

/** The latest graded skill test of a learner on some test activities. */
export type SkillTestOutcome = Readonly<{
  outcome: "passed" | "failed";
  recordedAt: string;
}>;

/**
 * Draws of skill tests for the caller's own Enrollments. Read and written inside the
 * caller's transaction with `app.organization_id` set.
 */
export abstract class SkillTestDrawsPort {
  abstract find(
    tx: DatabaseTransaction,
    organizationId: string,
    id: string
  ): Promise<SkillTestDraw | null>;
  /** Stores a new draw; the draw id is the learner's key, so a concurrent twin is refused. */
  abstract create(
    tx: DatabaseTransaction,
    draw: Omit<SkillTestDraw, "drawnAt" | "attemptId">
  ): Promise<SkillTestDraw>;
  /** How often each question key was shown on these Enrollments' draws of one test. */
  abstract timesSeen(
    tx: DatabaseTransaction,
    organizationId: string,
    enrollmentIds: readonly string[],
    activityVersionId: string
  ): Promise<ReadonlyMap<string, number>>;
  /** Links the draw to its Attempt; true when linked now or already to the same one. */
  abstract linkAttempt(
    tx: DatabaseTransaction,
    organizationId: string,
    id: string,
    attemptId: string
  ): Promise<boolean>;
  /** The latest skill test Evidence of these Enrollments on any of the activities. */
  abstract latestOutcome(
    tx: DatabaseTransaction,
    organizationId: string,
    enrollmentIds: readonly string[],
    activityVersionIds: readonly string[]
  ): Promise<SkillTestOutcome | null>;
}
