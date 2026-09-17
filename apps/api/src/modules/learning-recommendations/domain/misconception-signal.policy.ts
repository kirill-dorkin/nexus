export const REPEATED_TRUSTED_FAILURE_SIGNAL_POLICY = Object.freeze({
  key: "repeated-trusted-failure",
  version: 1,
  minimumConsecutiveFailures: 2
});

export type TrustedValidationEvidenceObservation = Readonly<{
  evidenceId: string;
  attemptId: string;
  skillId: string;
  outcome: "passed" | "failed";
  createdAt: string;
}>;

export type RepeatedTrustedFailureSignal = Readonly<{
  status: "suspected";
  code: "repeated_trusted_failure";
  skillId: string;
  consecutiveFailureCount: number;
  firstObservedAt: string;
  lastObservedAt: string;
}>;

function instant(value: string): number {
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) {
    throw new Error("Misconception signal observations require valid ISO timestamps.");
  }
  return parsed;
}

function newestFirst(
  left: TrustedValidationEvidenceObservation,
  right: TrustedValidationEvidenceObservation
): number {
  const timeOrder = instant(right.createdAt) - instant(left.createdAt);
  if (timeOrder !== 0) {
    return timeOrder;
  }
  return right.evidenceId.localeCompare(left.evidenceId);
}

export function repeatedTrustedFailureSignalsV1(
  observations: readonly TrustedValidationEvidenceObservation[]
): readonly RepeatedTrustedFailureSignal[] {
  const bySkill = new Map<string, TrustedValidationEvidenceObservation[]>();

  for (const observation of observations) {
    const existing = bySkill.get(observation.skillId) ?? [];
    existing.push(observation);
    bySkill.set(observation.skillId, existing);
  }

  const signals: RepeatedTrustedFailureSignal[] = [];

  for (const [skillId, skillObservations] of bySkill) {
    const ordered = [...skillObservations].sort(newestFirst);
    const latestByAttempt: TrustedValidationEvidenceObservation[] = [];
    const seenAttempts = new Set<string>();

    for (const observation of ordered) {
      if (seenAttempts.has(observation.attemptId)) {
        continue;
      }
      seenAttempts.add(observation.attemptId);
      latestByAttempt.push(observation);
    }

    const consecutiveFailures: TrustedValidationEvidenceObservation[] = [];
    for (const observation of latestByAttempt) {
      if (observation.outcome === "passed") {
        break;
      }
      consecutiveFailures.push(observation);
    }

    if (
      consecutiveFailures.length <
      REPEATED_TRUSTED_FAILURE_SIGNAL_POLICY.minimumConsecutiveFailures
    ) {
      continue;
    }

    const newestFailure = consecutiveFailures[0];
    const oldestFailure = consecutiveFailures[consecutiveFailures.length - 1];
    if (newestFailure === undefined || oldestFailure === undefined) {
      throw new Error("Misconception signal failure streak is unexpectedly empty.");
    }

    signals.push({
      status: "suspected",
      code: "repeated_trusted_failure",
      skillId,
      consecutiveFailureCount: consecutiveFailures.length,
      firstObservedAt: oldestFailure.createdAt,
      lastObservedAt: newestFailure.createdAt
    });
  }

  return signals.sort((left, right) => left.skillId.localeCompare(right.skillId));
}
