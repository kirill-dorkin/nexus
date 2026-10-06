import type { DatabaseTransaction } from "@platform/database";
import type { ManifestActivity } from "@platform/contracts";
/** Server-only protected Content port. Never use in public or learner read projections. */
export abstract class QuizValidationContentQuery {
  abstract requireDefinition(
    tx: DatabaseTransaction,
    organizationId: string,
    activityVersionId: string
  ): Promise<ManifestActivity>;
}
