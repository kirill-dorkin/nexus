import type { GuidedBuildDefinition } from "@platform/contracts";
import type { DatabaseTransaction } from "@platform/database";

import type {
  GuidedBuildHintMaterial,
  GuidedBuildSolutionMaterial
} from "./guided-build-content.repository";

export abstract class GuidedBuildContentQuery {
  abstract findDefinition(
    transaction: DatabaseTransaction,
    organizationId: string,
    activityVersionId: string
  ): Promise<GuidedBuildDefinition | null>;

  abstract findHintMaterial(
    transaction: DatabaseTransaction,
    organizationId: string,
    activityVersionId: string,
    stepKey: string,
    hintKey: string
  ): Promise<GuidedBuildHintMaterial | null>;

  abstract findSolutionMaterial(
    transaction: DatabaseTransaction,
    organizationId: string,
    activityVersionId: string,
    solutionKey: string
  ): Promise<GuidedBuildSolutionMaterial | null>;
}
