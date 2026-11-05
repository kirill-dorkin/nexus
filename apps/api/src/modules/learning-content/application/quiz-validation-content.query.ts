import type { DatabaseTransaction } from "@platform/database";
import type { ManifestActivity } from "@platform/contracts";
/**
 * Server-only protected Content port: the published definition of a quiz or a
 * file assignment (ADR-0073), with its answer key or checks and solution.
 * Never use in public or learner read projections.
 */
export abstract class QuizValidationContentQuery {
  abstract requireDefinition(
    tx: DatabaseTransaction,
    organizationId: string,
    activityVersionId: string
  ): Promise<ManifestActivity>;
}
