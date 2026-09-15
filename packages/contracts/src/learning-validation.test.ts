import { describe, expect, it } from "vitest";

import {
  activityValidationConfigSchema,
  recordValidationResultRequestSchema,
  validationResultSchema
} from "./index";

const organizationId = "01994f13-8de0-7a11-8d5f-1e8c5526f001";
const submissionId = "01994f13-8de0-7a11-8d5f-1e8c5526f002";
const activityVersionId = "01994f13-8de0-7a11-8d5f-1e8c5526f003";
const resultId = "01994f13-8de0-7a11-8d5f-1e8c5526f004";
const actorId = "01994f13-8de0-7a11-8d5f-1e8c5526f005";

describe("learning validation contracts", () => {
  it("pins an exact validator key/version/config inside ActivityVersion config", () => {
    expect(
      activityValidationConfigSchema.parse({
        validation: {
          validatorKey: "manual-review",
          validatorVersion: 1,
          config: { rubric: "foundation-v1" }
        },
        unrelatedActivityConfig: true
      }).validation
    ).toEqual({
      validatorKey: "manual-review",
      validatorVersion: 1,
      config: { rubric: "foundation-v1" }
    });
  });

  it("accepts a completed validation result command with learner outcome", () => {
    expect(
      recordValidationResultRequestSchema.parse({
        idempotencyKey: "review-001",
        status: "completed",
        outcome: "passed",
        score: 0.9,
        payload: { feedback: "Meets the rubric" }
      })
    ).toMatchObject({
      status: "completed",
      outcome: "passed",
      score: 0.9
    });
  });

  it("does not let a system error masquerade as learner failure", () => {
    expect(
      recordValidationResultRequestSchema.safeParse({
        idempotencyKey: "grader-001",
        status: "system_error",
        outcome: "failed",
        score: 0
      }).success
    ).toBe(false);
  });

  it("represents immutable validator attribution separately from Evidence", () => {
    expect(
      validationResultSchema.parse({
        id: resultId,
        organizationId,
        submissionId,
        activityVersionId,
        validatorKey: "manual-review",
        validatorVersion: 1,
        validatorConfig: { rubric: "foundation-v1" },
        idempotencyKey: "review-001",
        status: "completed",
        outcome: "needs_review",
        score: null,
        evidenceTrust: "trusted",
        payload: { feedback: "Retry independently" },
        recordedByUserId: actorId,
        recordedAt: "2026-09-15T05:00:00.000Z"
      }).submissionId
    ).toBe(submissionId);
  });
});
