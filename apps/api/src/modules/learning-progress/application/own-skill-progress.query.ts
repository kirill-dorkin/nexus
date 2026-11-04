import type { LearnerSkillProgress } from "@platform/contracts";
import type { DatabaseTransaction } from "@platform/database";

/**
 * Skill progress for the caller's own enrollment, read inside the caller's
 * transaction. Own-enrollment is the authority here (as for own quiz checks):
 * a free self-enrolled learner holds no role assignment.
 */
export abstract class OwnSkillProgressQuery {
  abstract ownSkills(
    transaction: DatabaseTransaction,
    organizationId: string,
    enrollmentId: string
  ): Promise<readonly LearnerSkillProgress[]>;
}
