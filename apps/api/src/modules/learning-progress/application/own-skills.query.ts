import type { OwnSkill } from "@platform/contracts";
import type { DatabaseTransaction } from "@platform/database";

/**
 * ADR-0074 point 6: the caller's own Mastery and confirmations for every
 * organization Skill with Evidence, keyed by `skillKey`. Read inside the
 * caller's transaction with `app.organization_id` already set; authority is
 * the caller's own data, so no role is required.
 */
export abstract class OwnSkillsQuery {
  abstract ownOrganizationSkills(
    transaction: DatabaseTransaction,
    organizationId: string
  ): Promise<readonly OwnSkill[]>;
}
