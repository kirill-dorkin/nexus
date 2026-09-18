import { Injectable } from "@nestjs/common";
import type { DatabaseTransaction } from "@platform/database";

import { TrustedValidationEvidenceQuery } from "../../learning-progress/application/learning-progress.query";
import {
  repeatedTrustedFailureSignalsV1,
  type RepeatedTrustedFailureSignal
} from "../domain/misconception-signal.policy";
import { MisconceptionSignalQuery } from "./misconception-signal.query";

@Injectable()
export class MisconceptionSignalApplicationService extends MisconceptionSignalQuery {
  constructor(
    private readonly trustedEvidence: TrustedValidationEvidenceQuery
  ) {
    super();
  }

  async listSignals(
    transaction: DatabaseTransaction,
    organizationId: string,
    learnerUserId: string,
    skillIds: readonly string[]
  ): Promise<readonly RepeatedTrustedFailureSignal[]> {
    const observations = await this.trustedEvidence.listObservations(
      transaction,
      organizationId,
      learnerUserId,
      skillIds
    );
    return repeatedTrustedFailureSignalsV1(observations);
  }
}
