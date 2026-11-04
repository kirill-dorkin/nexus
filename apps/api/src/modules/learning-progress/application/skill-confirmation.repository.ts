import type { DatabaseTransaction } from "@platform/database";

/** Passing Evidence of one Skill: Evidence whose validation outcome is `passed`. */
export type SkillConfirmationAggregate = Readonly<{
  skillId: string;
  confirmations: number;
  firstConfirmedAt: string;
  lastConfirmedAt: string;
  /** Distinct UTC dates (`YYYY-MM-DD`) with a confirmation, ascending, the latest 30. */
  confirmedDays: readonly string[];
}>;

export abstract class SkillConfirmationRepository {
  /** Per Skill, the passing Evidence recorded for Attempts of the given enrollments. */
  abstract aggregateConfirmations(
    transaction: DatabaseTransaction,
    organizationId: string,
    enrollmentIds: readonly string[]
  ): Promise<readonly SkillConfirmationAggregate[]>;
}
