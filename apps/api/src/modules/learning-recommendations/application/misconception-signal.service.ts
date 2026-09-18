import { Injectable } from "@nestjs/common";
import type { DatabaseTransaction } from "@platform/database";

import {
  TrustedValidationEvidenceQuery,
  type LearnerEnrollmentReference
} from "../../learning-progress/application/learning-progress.query";
import {
  repeatedTrustedFailureSignalsV1,
  type RepeatedTrustedFailureSignal
} from "../domain/misconception-signal.policy";
import {
  MisconceptionSignalQuery,
  type LearnerRepeatedTrustedFailureSignal
} from "./misconception-signal.query";

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

  async listSignalsForEnrollments(
    transaction: DatabaseTransaction,
    organizationId: string,
    learnerEnrollments: readonly LearnerEnrollmentReference[],
    skillIds: readonly string[]
  ): Promise<readonly LearnerRepeatedTrustedFailureSignal[]> {
    const observations =
      await this.trustedEvidence.listObservationsForEnrollments(
        transaction,
        organizationId,
        learnerEnrollments,
        skillIds
      );

    const observationsByLearner = new Map<
      string,
      typeof observations[number][]
    >();
    for (const observation of observations) {
      const current = observationsByLearner.get(observation.learnerUserId) ?? [];
      current.push(observation);
      observationsByLearner.set(observation.learnerUserId, current);
    }

    const signals: LearnerRepeatedTrustedFailureSignal[] = [];
    for (const [learnerUserId, learnerObservations] of observationsByLearner) {
      for (const signal of repeatedTrustedFailureSignalsV1(learnerObservations)) {
        signals.push({
          learnerUserId,
          ...signal
        });
      }
    }

    return signals;
  }
}
