import type { SkillTestQuestion } from "@platform/contracts";
import type { DatabaseTransaction } from "@platform/database";

/** A published `skill.test` activity version and the skill it tests (ADR-0075). */
export type PublishedSkillTest = Readonly<{
  activityVersionId: string;
  courseVersionId: string;
  skillKey: string;
}>;

/**
 * Server-only protected Content port of skill tests. `requireBank` returns answers
 * and explanations: never use it in public or learner read projections.
 */
export abstract class SkillTestContentQuery {
  /** Skill tests of published manifest versions, optionally only for some skills. */
  abstract publishedTests(
    tx: DatabaseTransaction,
    organizationId: string,
    courseVersionIds: readonly string[],
    skillKeys?: readonly string[]
  ): Promise<readonly PublishedSkillTest[]>;
  abstract requireBank(
    tx: DatabaseTransaction,
    organizationId: string,
    activityVersionId: string
  ): Promise<readonly SkillTestQuestion[]>;
}
