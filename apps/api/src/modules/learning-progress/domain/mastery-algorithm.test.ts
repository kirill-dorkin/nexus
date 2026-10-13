import { describe, expect, it } from "vitest";

import {
  computeMastery,
  MASTERY_ALGORITHM_KEY,
  MASTERY_ALGORITHM_VERSION
} from "./mastery-algorithm";

describe("mastery algorithm v1", () => {
  it("uses an equal-weight mean of scored Evidence only", () => {
    expect(
      computeMastery({
        evidenceCount: 3,
        scoredEvidenceCount: 2,
        scoreTotal: 1.4
      })
    ).toEqual({ masteryScore: 0.7 });
  });

  it("keeps Mastery unknown when Evidence has no numeric score", () => {
    expect(
      computeMastery({
        evidenceCount: 2,
        scoredEvidenceCount: 0,
        scoreTotal: 0
      })
    ).toEqual({ masteryScore: null });
  });

  it("rounds the materialized score to five decimal places", () => {
    expect(
      computeMastery({
        evidenceCount: 3,
        scoredEvidenceCount: 3,
        scoreTotal: 2
      })
    ).toEqual({ masteryScore: 0.66667 });
  });

  it("rejects impossible aggregates instead of materializing corrupt state", () => {
    expect(() =>
      computeMastery({
        evidenceCount: 1,
        scoredEvidenceCount: 2,
        scoreTotal: 1
      })
    ).toThrow("Invalid scored Evidence count.");
  });

  it("has an explicit stable algorithm identity", () => {
    expect(MASTERY_ALGORITHM_KEY).toBe("mean-scored-evidence");
    expect(MASTERY_ALGORITHM_VERSION).toBe(1);
  });
});
