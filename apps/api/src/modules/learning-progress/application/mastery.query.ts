import type { MasteryProjection } from "@platform/contracts";
import type { DatabaseTransaction } from "@platform/database";

export abstract class MasteryQuery {
  abstract listUserMastery(
    transaction: DatabaseTransaction,
    organizationId: string,
    userId: string
  ): Promise<readonly MasteryProjection[]>;
}
