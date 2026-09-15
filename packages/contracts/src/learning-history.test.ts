import { describe, expect, it } from "vitest";

import {
  learningEventHistoryQuerySchema,
  learningEventSchema
} from "./learning-history";

const ids = {
  event: "01999999-0000-7000-8000-000000000001",
  organization: "01999999-0000-7000-8000-000000000002",
  enrollment: "01999999-0000-7000-8000-000000000003",
  attempt: "01999999-0000-7000-8000-000000000004",
  activity: "01999999-0000-7000-8000-000000000005",
  submission: "01999999-0000-7000-8000-000000000006",
  validation: "01999999-0000-7000-8000-000000000007",
  evidence: "01999999-0000-7000-8000-000000000008",
  skill: "01999999-0000-7000-8000-000000000009"
} as const;

const base = {
  id: ids.event,
  organizationId: ids.organization,
  enrollmentId: ids.enrollment,
  attemptId: ids.attempt,
  activityVersionId: ids.activity,
  attemptNumber: 1,
  eventVersion: 1 as const,
  occurredAt: "2026-09-15T05:00:00.000Z"
};

describe("learning history contracts", () => {
  it("accepts the four canonical learner event variants", () => {
    expect(
      learningEventSchema.parse({ ...base, eventName: "attempt.started" }).eventName
    ).toBe("attempt.started");
    expect(
      learningEventSchema.parse({
        ...base,
        eventName: "submission.submitted",
        submissionId: ids.submission
      }).eventName
    ).toBe("submission.submitted");
    expect(
      learningEventSchema.parse({
        ...base,
        eventName: "validation.result_recorded",
        submissionId: ids.submission,
        validationResultId: ids.validation,
        outcome: "needs_review",
        score: null
      }).eventName
    ).toBe("validation.result_recorded");
    expect(
      learningEventSchema.parse({
        ...base,
        eventName: "evidence.recorded",
        submissionId: ids.submission,
        evidenceId: ids.evidence,
        skillId: ids.skill,
        kind: "foundation.structured-practice",
        score: 0.8,
        source: {
          type: "validation_result",
          validationResultId: ids.validation
        }
      }).eventName
    ).toBe("evidence.recorded");
  });

  it("rejects raw validator and learner payload fields", () => {
    expect(() =>
      learningEventSchema.parse({
        ...base,
        eventName: "validation.result_recorded",
        submissionId: ids.submission,
        validationResultId: ids.validation,
        outcome: "passed",
        score: 1,
        validatorKey: "manual-review",
        payload: { hidden: true }
      })
    ).toThrow();
  });

  it("requires exact validation provenance for validation-derived Evidence", () => {
    expect(() =>
      learningEventSchema.parse({
        ...base,
        eventName: "evidence.recorded",
        submissionId: ids.submission,
        evidenceId: ids.evidence,
        skillId: ids.skill,
        kind: "foundation.structured-practice",
        score: 1,
        source: { type: "validation_result" }
      })
    ).toThrow();
  });

  it("defaults history page size and coerces query strings", () => {
    expect(learningEventHistoryQuerySchema.parse({})).toEqual({ limit: 50 });
    expect(learningEventHistoryQuerySchema.parse({ limit: "25" })).toEqual({
      limit: 25
    });
    expect(() => learningEventHistoryQuerySchema.parse({ limit: "101" })).toThrow();
  });
});
