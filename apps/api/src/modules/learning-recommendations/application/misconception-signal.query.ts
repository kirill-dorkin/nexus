import type { DatabaseTransaction } from "@platform/database";

import type { LearnerEnrollmentReference } from "../../learning-progress/application/learning-progress.query";
import type { RepeatedTrustedFailureSignal } from "../domain/misconception-signal.policy";

export type LearnerRepeatedTrustedFailureSignal = RepeatedTrustedFailureSignal &
  Readonly<{
    learnerUserId: string;
  }>;

export abstract class MisconceptionSignalQuery {
  abstract listSignals(
    transaction: DatabaseTransaction,
    organizationId: string,
    learnerUserId: string,
    skillIds: readonly string[]
  ): Promise<readonly RepeatedTrustedFailureSignal[]>;

  abstract listSignalsForEnrollments(
    transaction: DatabaseTransaction,
    organizationId: string,
    learnerEnrollments: readonly LearnerEnrollmentReference[],
    skillIds: readonly string[]
  ): Promise<readonly LearnerRepeatedTrustedFailureSignal[]>;
}
