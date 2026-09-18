import { describe, expect, it } from "vitest";

import { courseReadinessDecisionSchema } from "./readiness";

const ids = {
  organizationId: "00000000-0000-4000-8000-000000000001",
  enrollmentId: "00000000-0000-4000-8000-000000000002",
  offeringId: "00000000-0000-4000-8000-000000000003",
  courseVersionId: "00000000-0000-4000-8000-000000000004",
  skillId: "00000000-0000-4000-8000-000000000005"
} as const;

const policy = {
  key: "course-progression-readiness",
  version: 1,
  masteryAlgorithm: { key: "mean-scored-evidence", version: 1 },
  masteryTarget: 0.8,
  minimumScoredAttemptsPerSkill: 2,
  evidenceFreshnessDays: 7
} as const;

describe("courseReadinessDecisionSchema", () => {
  it("accepts a fully ready decision with a bounded readiness horizon", () => {
    expect(
      courseReadinessDecisionSchema.parse({
        ...ids,
        evaluatedAt: "2026-09-18T00:00:00.000Z",
        policy,
        status: "ready",
        readyUntil: "2026-09-24T00:00:00.000Z",
        skills: [
          {
            skillId: ids.skillId,
            title: "Layout",
            position: 0,
            status: "ready",
            masteryScore: 0.9,
            scoredAttemptCount: 3,
            lastScoredEvidenceAt: "2026-09-17T00:00:00.000Z",
            freshUntil: "2026-09-24T00:00:00.000Z",
            reasons: []
          }
        ]
      }).status
    ).toBe("ready");
  });

  it("accepts explicit insufficient evidence instead of coercing it into failure", () => {
    expect(
      courseReadinessDecisionSchema.parse({
        ...ids,
        evaluatedAt: "2026-09-18T00:00:00.000Z",
        policy,
        status: "insufficient_evidence",
        readyUntil: null,
        skills: [
          {
            skillId: ids.skillId,
            title: "Layout",
            position: 0,
            status: "insufficient_evidence",
            masteryScore: 1,
            scoredAttemptCount: 1,
            lastScoredEvidenceAt: "2026-09-17T00:00:00.000Z",
            freshUntil: "2026-09-24T00:00:00.000Z",
            reasons: [
              {
                code: "insufficient_scored_attempts",
                observedScoredAttemptCount: 1,
                requiredScoredAttemptCount: 2
              }
            ]
          }
        ]
      }).status
    ).toBe("insufficient_evidence");
  });

  it("rejects ready output when any skill is not ready", () => {
    expect(() =>
      courseReadinessDecisionSchema.parse({
        ...ids,
        evaluatedAt: "2026-09-18T00:00:00.000Z",
        policy,
        status: "ready",
        readyUntil: "2026-09-24T00:00:00.000Z",
        skills: [
          {
            skillId: ids.skillId,
            title: "Layout",
            position: 0,
            status: "not_ready",
            masteryScore: 0.7,
            scoredAttemptCount: 3,
            lastScoredEvidenceAt: "2026-09-17T00:00:00.000Z",
            freshUntil: "2026-09-24T00:00:00.000Z",
            reasons: [
              {
                code: "mastery_below_target",
                masteryScore: 0.7,
                targetMasteryScore: 0.8
              }
            ]
          }
        ]
      })
    ).toThrow();
  });

  it("rejects insufficient overall status when a definitive blocker exists", () => {
    expect(() =>
      courseReadinessDecisionSchema.parse({
        ...ids,
        evaluatedAt: "2026-09-18T00:00:00.000Z",
        policy,
        status: "insufficient_evidence",
        readyUntil: null,
        skills: [
          {
            skillId: ids.skillId,
            title: "Layout",
            position: 0,
            status: "not_ready",
            masteryScore: 0.8,
            scoredAttemptCount: 3,
            lastScoredEvidenceAt: "2026-09-01T00:00:00.000Z",
            freshUntil: "2026-09-08T00:00:00.000Z",
            reasons: [
              {
                code: "scored_evidence_stale",
                lastScoredEvidenceAt: "2026-09-01T00:00:00.000Z",
                freshUntil: "2026-09-08T00:00:00.000Z"
              }
            ]
          }
        ]
      })
    ).toThrow();
  });
});
