import type { GuidedBuildProtectedDefinition } from "@platform/contracts";
import type { DatabaseTransaction } from "@platform/database";

export abstract class GuidedBuildContentQuery {
  abstract requireGuidedBuildDefinition(
    transaction: DatabaseTransaction,
    organizationId: string,
    activityVersionId: string
  ): Promise<GuidedBuildProtectedDefinition>;
}
