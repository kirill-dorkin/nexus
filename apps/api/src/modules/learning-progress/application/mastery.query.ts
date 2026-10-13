import type { MasteryProjection } from "@platform/contracts";
import type { DatabaseTransaction } from "@platform/database";

export abstract class MasteryQuery {
  abstract listUserMastery(
    transaction: DatabaseTransaction,
    organizationId: string,
    userId: string
  ): Promise<readonly MasteryProjection[]>;

  abstract listUsersMastery(
    transaction: DatabaseTransaction,
    organizationId: string,
    userIds: readonly string[],
    skillIds: readonly string[]
  ): Promise<readonly MasteryProjection[]>;
}
