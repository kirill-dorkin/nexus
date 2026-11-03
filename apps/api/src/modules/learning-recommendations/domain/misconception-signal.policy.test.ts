import { describe, expect, it } from "vitest";

import {
  REPEATED_TRUSTED_FAILURE_SIGNAL_POLICY,
  repeatedTrustedFailureSignalsV1,
  type TrustedValidationEvidenceObservation
} from "./misconception-signal.policy";

function observation(
  overrides: Partial<TrustedValidationEvidenceObservation> = {}
): TrustedValidationEvidenceObservation {
  return {
    evidenceId: overrides.evidenceId ?? "00000000-0000-7000-8000-000000000001",
    attemptId: overrides.attemptId ?? "00000000-0000-7000-8000-000000000011",
    skillId: overrides.skillId ?? "00000000-0000-7000-8000-000000000021",
    outcome: overrides.outcome ?? "failed",
    createdAt: overrides.createdAt ?? "2026-09-10T00:00:00.000Z"
  };
}

describe("repeated-trusted-failure@1", () => {
  it("pins the explicit policy contract", () => {
    expect(REPEATED_TRUSTED_FAILURE_SIGNAL_POLICY).toEqual({
      key: "repeated-trusted-failure",
      version: 1,
      minimumConsecutiveFailures: 2
    });
  });

  it("does not infer a misconception from one failed attempt", () => {
    expect(repeatedTrustedFailureSignalsV1([observation()])).toEqual([]);
  });

  it("surfaces a suspected signal after two consecutive failed attempts", () => {
    const skillId = "00000000-0000-7000-8000-000000000021";
    const result = repeatedTrustedFailureSignalsV1([
      observation({
        evidenceId: "00000000-0000-7000-8000-000000000002",
        attemptId: "00000000-0000-7000-8000-000000000012",
        skillId,
        createdAt: "2026-09-11T00:00:00.000Z"
      }),
      observation({ skillId })
    ]);

    expect(result).toEqual([
      {
        status: "suspected",
        code: "repeated_trusted_failure",
        skillId,
        consecutiveFailureCount: 2,
        firstObservedAt: "2026-09-10T00:00:00.000Z",
        lastObservedAt: "2026-09-11T00:00:00.000Z"
      }
    ]);
  });

  it("clears the active streak when the latest distinct attempt passed", () => {
    expect(
      repeatedTrustedFailureSignalsV1([
        observation({
          evidenceId: "00000000-0000-7000-8000-000000000003",
          attemptId: "00000000-0000-7000-8000-000000000013",
          outcome: "passed",
          createdAt: "2026-09-12T00:00:00.000Z"
        }),
        observation({
          evidenceId: "00000000-0000-7000-8000-000000000002",
          attemptId: "00000000-0000-7000-8000-000000000012",
          createdAt: "2026-09-11T00:00:00.000Z"
        }),
        observation()
      ])
    ).toEqual([]);
  });

  it("uses only the latest trusted observation for each attempt", () => {
    expect(
      repeatedTrustedFailureSignalsV1([
        observation({
          evidenceId: "00000000-0000-7000-8000-000000000004",
          attemptId: "00000000-0000-7000-8000-000000000012",
          outcome: "passed",
          createdAt: "2026-09-11T01:00:00.000Z"
        }),
        observation({
          evidenceId: "00000000-0000-7000-8000-000000000003",
          attemptId: "00000000-0000-7000-8000-000000000012",
          createdAt: "2026-09-11T00:00:00.000Z"
        }),
        observation()
      ])
    ).toEqual([]);
  });

  it("keeps skill streaks independent and deterministically ordered", () => {
    const skillA = "00000000-0000-7000-8000-000000000021";
    const skillB = "00000000-0000-7000-8000-000000000022";
    const result = repeatedTrustedFailureSignalsV1([
      observation({
        skillId: skillB,
        attemptId: "00000000-0000-7000-8000-000000000031"
      }),
      observation({
        evidenceId: "00000000-0000-7000-8000-000000000005",
        skillId: skillB,
        attemptId: "00000000-0000-7000-8000-000000000032",
        createdAt: "2026-09-11T00:00:00.000Z"
      }),
      observation({ skillId: skillA }),
      observation({
        evidenceId: "00000000-0000-7000-8000-000000000006",
        skillId: skillA,
        attemptId: "00000000-0000-7000-8000-000000000012",
        createdAt: "2026-09-11T00:00:00.000Z"
      })
    ]);

    expect(result.map((signal) => signal.skillId)).toEqual([skillA, skillB]);
  });

  it("rejects malformed observation timestamps", () => {
    expect(() =>
      repeatedTrustedFailureSignalsV1([
        observation({ createdAt: "not-a-timestamp" }),
        observation({
          evidenceId: "00000000-0000-7000-8000-000000000002",
          attemptId: "00000000-0000-7000-8000-000000000012"
        })
      ])
    ).toThrow("valid ISO timestamps");
  });
});
