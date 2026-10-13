import { describe, expect, it } from "vitest";

import {
  COURSE_PROGRESSION_READINESS_POLICY,
  courseProgressionReadinessV1,
  type CourseReadinessPolicyInput
} from "./course-readiness.policy";

const skillA = {
  skillId: "00000000-0000-4000-8000-000000000001",
  title: "Layout",
  position: 0
} as const;
const skillB = {
  skillId: "00000000-0000-4000-8000-000000000002",
  title: "Composition",
  position: 1
} as const;

function input(
  overrides: Partial<CourseReadinessPolicyInput> = {}
): CourseReadinessPolicyInput {
  return {
    evaluatedAt: "2026-09-18T00:00:00.000Z",
    skills: [skillA],
    mastery: [
      {
        skillId: skillA.skillId,
        algorithmKey: "mean-scored-evidence",
        algorithmVersion: 1,
        masteryScore: 1,
        scoredEvidenceCount: 2
      }
    ],
    evidence: [
      {
        skillId: skillA.skillId,
        scoredAttemptCount: 2,
        lastScoredEvidenceAt: "2026-09-17T00:00:00.000Z"
      }
    ],
    signals: [],
    ...overrides
  };
}

describe("courseProgressionReadinessV1", () => {
  it("does not call one perfect scored Attempt ready", () => {
    const decision = courseProgressionReadinessV1(
      input({
        mastery: [
          {
            skillId: skillA.skillId,
            algorithmKey: "mean-scored-evidence",
            algorithmVersion: 1,
            masteryScore: 1,
            scoredEvidenceCount: 1
          }
        ],
        evidence: [
          {
            skillId: skillA.skillId,
            scoredAttemptCount: 1,
            lastScoredEvidenceAt: "2026-09-17T00:00:00.000Z"
          }
        ]
      })
    );

    expect(decision).toMatchObject({
      status: "insufficient_evidence",
      readyUntil: null,
      skills: [
        {
          skillId: skillA.skillId,
          status: "insufficient_evidence",
          masteryScore: 1,
          scoredAttemptCount: 1,
          reasons: [
            {
              code: "insufficient_scored_attempts",
              observedScoredAttemptCount: 1,
              requiredScoredAttemptCount: 2
            }
          ]
        }
      ]
    });
  });

  it("is ready only with sufficient, mastered, fresh, signal-free evidence", () => {
    expect(courseProgressionReadinessV1(input())).toMatchObject({
      status: "ready",
      readyUntil: "2026-09-24T00:00:00.000Z",
      skills: [
        {
          skillId: skillA.skillId,
          status: "ready",
          masteryScore: 1,
          scoredAttemptCount: 2,
          freshUntil: "2026-09-24T00:00:00.000Z",
          reasons: []
        }
      ]
    });
  });

  it("keeps sufficient evidence below the mastery target as definitively not ready", () => {
    expect(
      courseProgressionReadinessV1(
        input({
          mastery: [
            {
              skillId: skillA.skillId,
              algorithmKey: "mean-scored-evidence",
              algorithmVersion: 1,
              masteryScore: 0.79,
              scoredEvidenceCount: 2
            }
          ]
        })
      )
    ).toMatchObject({
      status: "not_ready",
      skills: [
        {
          status: "not_ready",
          reasons: [
            {
              code: "mastery_below_target",
              masteryScore: 0.79,
              targetMasteryScore: 0.8
            }
          ]
        }
      ]
    });
  });

  it("treats stale scored Evidence as a blocker without reusing review lastEvidenceAt", () => {
    expect(
      courseProgressionReadinessV1(
        input({
          evidence: [
            {
              skillId: skillA.skillId,
              scoredAttemptCount: 2,
              lastScoredEvidenceAt: "2026-09-11T00:00:00.000Z"
            }
          ]
        })
      )
    ).toMatchObject({
      status: "not_ready",
      skills: [
        {
          status: "not_ready",
          reasons: [
            {
              code: "scored_evidence_stale",
              freshUntil: "2026-09-18T00:00:00.000Z"
            }
          ]
        }
      ]
    });
  });

  it("blocks readiness on an active repeated trusted failure even at the mastery threshold", () => {
    expect(
      courseProgressionReadinessV1(
        input({
          mastery: [
            {
              skillId: skillA.skillId,
              algorithmKey: "mean-scored-evidence",
              algorithmVersion: 1,
              masteryScore: 0.8,
              scoredEvidenceCount: 10
            }
          ],
          evidence: [
            {
              skillId: skillA.skillId,
              scoredAttemptCount: 10,
              lastScoredEvidenceAt: "2026-09-17T00:00:00.000Z"
            }
          ],
          signals: [
            {
              skillId: skillA.skillId,
              consecutiveFailureCount: 2,
              firstObservedAt: "2026-09-16T00:00:00.000Z",
              lastObservedAt: "2026-09-17T00:00:00.000Z"
            }
          ]
        })
      )
    ).toMatchObject({
      status: "not_ready",
      skills: [
        {
          status: "not_ready",
          masteryScore: 0.8,
          reasons: [
            {
              code: "active_repeated_trusted_failure",
              consecutiveFailureCount: 2
            }
          ]
        }
      ]
    });
  });

  it("lets definitive blockers outrank insufficient evidence at overall level", () => {
    const decision = courseProgressionReadinessV1(
      input({
        skills: [skillA, skillB],
        mastery: [
          {
            skillId: skillA.skillId,
            algorithmKey: "mean-scored-evidence",
            algorithmVersion: 1,
            masteryScore: 1,
            scoredEvidenceCount: 1
          },
          {
            skillId: skillB.skillId,
            algorithmKey: "mean-scored-evidence",
            algorithmVersion: 1,
            masteryScore: 0.5,
            scoredEvidenceCount: 2
          }
        ],
        evidence: [
          {
            skillId: skillA.skillId,
            scoredAttemptCount: 1,
            lastScoredEvidenceAt: "2026-09-17T00:00:00.000Z"
          },
          {
            skillId: skillB.skillId,
            scoredAttemptCount: 2,
            lastScoredEvidenceAt: "2026-09-17T00:00:00.000Z"
          }
        ]
      })
    );

    expect(decision.status).toBe("not_ready");
    expect(decision.skills.map((skill) => skill.status)).toEqual([
      "insufficient_evidence",
      "not_ready"
    ]);
  });

  it("fails closed when the Mastery algorithm is not the policy-pinned version", () => {
    expect(() =>
      courseProgressionReadinessV1(
        input({
          mastery: [
            {
              skillId: skillA.skillId,
              algorithmKey: "mean-scored-evidence",
              algorithmVersion: 2,
              masteryScore: 1,
              scoredEvidenceCount: 2
            }
          ]
        })
      )
    ).toThrow("requires mean-scored-evidence@1");
  });

  it("fails closed on impossible Evidence/Mastery composition", () => {
    expect(() =>
      courseProgressionReadinessV1(
        input({
          mastery: [],
          evidence: [
            {
              skillId: skillA.skillId,
              scoredAttemptCount: 2,
              lastScoredEvidenceAt: "2026-09-17T00:00:00.000Z"
            }
          ]
        })
      )
    ).toThrow("requires a Mastery projection");
  });

  it("pins explicit v1 policy parameters", () => {
    expect(COURSE_PROGRESSION_READINESS_POLICY).toEqual({
      key: "course-progression-readiness",
      version: 1,
      masteryAlgorithm: {
        key: "mean-scored-evidence",
        version: 1
      },
      masteryTarget: 0.8,
      minimumScoredAttemptsPerSkill: 2,
      evidenceFreshnessDays: 7
    });
  });
});
