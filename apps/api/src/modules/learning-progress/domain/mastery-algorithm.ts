export const MASTERY_ALGORITHM_KEY = "mean-scored-evidence";
export const MASTERY_ALGORITHM_VERSION = 1;

export type MasteryEvidenceAggregate = Readonly<{
  evidenceCount: number;
  scoredEvidenceCount: number;
  scoreTotal: number;
}>;

export type MasteryComputation = Readonly<{
  masteryScore: number | null;
}>;

function roundFiveDecimals(value: number): number {
  return Math.round(value * 100_000) / 100_000;
}

export function computeMastery(
  aggregate: MasteryEvidenceAggregate
): MasteryComputation {
  if (!Number.isInteger(aggregate.evidenceCount) || aggregate.evidenceCount <= 0) {
    throw new Error("Mastery requires at least one Evidence record.");
  }
  if (
    !Number.isInteger(aggregate.scoredEvidenceCount) ||
    aggregate.scoredEvidenceCount < 0 ||
    aggregate.scoredEvidenceCount > aggregate.evidenceCount
  ) {
    throw new Error("Invalid scored Evidence count.");
  }
  if (
    !Number.isFinite(aggregate.scoreTotal) ||
    aggregate.scoreTotal < 0 ||
    aggregate.scoreTotal > aggregate.scoredEvidenceCount
  ) {
    throw new Error("Invalid Evidence score total.");
  }

  if (aggregate.scoredEvidenceCount === 0) {
    if (aggregate.scoreTotal !== 0) {
      throw new Error("Unscored Evidence cannot contribute to the score total.");
    }
    return { masteryScore: null };
  }

  return {
    masteryScore: roundFiveDecimals(
      aggregate.scoreTotal / aggregate.scoredEvidenceCount
    )
  };
}
