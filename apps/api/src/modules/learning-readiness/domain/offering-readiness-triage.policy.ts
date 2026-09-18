export const OFFERING_READINESS_TRIAGE_POLICY = Object.freeze({
  key: "offering-readiness-triage",
  version: 1,
  statusOrder: Object.freeze([
    "not_ready",
    "insufficient_evidence",
    "ready"
  ] as const)
});

export type OfferingReadinessTriageStatus =
  (typeof OFFERING_READINESS_TRIAGE_POLICY.statusOrder)[number];

export type OfferingReadinessTriageCandidate = Readonly<{
  enrollmentId: string;
  enrolledAt: string;
  status: OfferingReadinessTriageStatus;
}>;

const statusRank: Readonly<Record<OfferingReadinessTriageStatus, number>> = {
  not_ready: 0,
  insufficient_evidence: 1,
  ready: 2
};

function parseInstant(value: string): number {
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) {
    throw new Error("Offering readiness triage requires a valid enrolledAt instant.");
  }
  return parsed;
}

export function orderOfferingReadinessV1<
  T extends OfferingReadinessTriageCandidate
>(candidates: readonly T[]): T[] {
  for (const candidate of candidates) {
    parseInstant(candidate.enrolledAt);
  }

  return [...candidates].sort(
    (left, right) =>
      statusRank[left.status] - statusRank[right.status] ||
      parseInstant(left.enrolledAt) - parseInstant(right.enrolledAt) ||
      left.enrollmentId.localeCompare(right.enrollmentId)
  );
}
