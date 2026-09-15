import type {
  CourseVersionActivity,
  ValidationResult
} from "@platform/contracts";
import { describe, expect, it } from "vitest";

import { normalizeTrustedValidationResult } from "./trusted-validation-evidence-normalizer";

const organizationId = "01994f13-8de0-7a11-8d5f-1e8c5526f001";
const activityVersionId = "01994f13-8de0-7a11-8d5f-1e8c5526f002";
const skillA = "01994f13-8de0-7a11-8d5f-1e8c5526f003";
const skillB = "01994f13-8de0-7a11-8d5f-1e8c5526f004";

const activity: CourseVersionActivity = {
  id: activityVersionId,
  organizationId,
  courseVersionId: "01994f13-8de0-7a11-8d5f-1e8c5526f005",
  activityId: "01994f13-8de0-7a11-8d5f-1e8c5526f006",
  slug: "responsive-layout",
  activityType: "foundation.structured-practice",
  title: "Responsive layout",
  instructions: null,
  config: {},
  position: 0,
  skillIds: [skillA, skillB]
};

function result(
  overrides: Partial<ValidationResult> = {}
): ValidationResult {
  return {
    id: "01994f13-8de0-7a11-8d5f-1e8c5526f007",
    organizationId,
    submissionId: "01994f13-8de0-7a11-8d5f-1e8c5526f008",
    activityVersionId,
    validatorKey: "manual-review",
    validatorVersion: 1,
    validatorConfig: {},
    idempotencyKey: "validation-1",
    status: "completed",
    outcome: "passed",
    score: 0.85,
    evidenceTrust: "trusted",
    payload: { privateFeedback: "raw validator detail" },
    recordedByUserId: "01994f13-8de0-7a11-8d5f-1e8c5526f009",
    recordedAt: "2026-09-15T05:00:00.000Z",
    ...overrides
  };
}

describe("trusted ValidationResult evidence normalization", () => {
  it("maps one trusted decisive result to every assessed skill without raw payload", () => {
    expect(normalizeTrustedValidationResult(result(), activity)).toEqual([
      {
        skillId: skillA,
        kind: "foundation.structured-practice",
        score: 0.85,
        payload: { outcome: "passed" }
      },
      {
        skillId: skillB,
        kind: "foundation.structured-practice",
        score: 0.85,
        payload: { outcome: "passed" }
      }
    ]);
  });

  it("uses deterministic score fallbacks for decisive unscored outcomes", () => {
    expect(
      normalizeTrustedValidationResult(result({ score: null }), activity)[0]?.score
    ).toBe(1);
    expect(
      normalizeTrustedValidationResult(
        result({ outcome: "failed", score: null }),
        activity
      )[0]?.score
    ).toBe(0);
  });

  it("does not generate Evidence from review, system-error, or advisory results", () => {
    expect(
      normalizeTrustedValidationResult(
        result({ outcome: "needs_review", score: null }),
        activity
      )
    ).toEqual([]);
    expect(
      normalizeTrustedValidationResult(
        result({ status: "system_error", outcome: null, score: null }),
        activity
      )
    ).toEqual([]);
    expect(
      normalizeTrustedValidationResult(result({ evidenceTrust: "advisory" }), activity)
    ).toEqual([]);
  });

  it("rejects normalization against a different ActivityVersion", () => {
    expect(() =>
      normalizeTrustedValidationResult(result(), {
        ...activity,
        id: "01994f13-8de0-7a11-8d5f-1e8c5526f010"
      })
    ).toThrow("exact ActivityVersion");
  });
});
