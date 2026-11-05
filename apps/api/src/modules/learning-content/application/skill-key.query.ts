import type { DatabaseTransaction } from "@platform/database";

/** Organization Skill identities by id: the stable `skillKey` of each (ADR-0074). */
export abstract class SkillKeyQuery {
  /** Keys of the given Skills of the organization; unknown ids are left out. */
  abstract skillKeys(
    transaction: DatabaseTransaction,
    organizationId: string,
    skillIds: readonly string[]
  ): Promise<ReadonlyMap<string, string>>;
}
