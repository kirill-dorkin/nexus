import type { DatabaseTransaction } from "@platform/database";

import type { RepeatedTrustedFailureSignal } from "../domain/misconception-signal.policy";

export abstract class MisconceptionSignalQuery {
  abstract listSignals(
    transaction: DatabaseTransaction,
    organizationId: string,
    learnerUserId: string,
    skillIds: readonly string[]
  ): Promise<readonly RepeatedTrustedFailureSignal[]>;
}
