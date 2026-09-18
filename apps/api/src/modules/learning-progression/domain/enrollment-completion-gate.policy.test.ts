import { describe, expect, it } from "vitest";

import {
  ENROLLMENT_COMPLETION_GATE_POLICY,
  courseReadinessEnrollmentCompletionGateV1
} from "./enrollment-completion-gate.policy";

describe("courseReadinessEnrollmentCompletionGateV1", () => {
  it("allows completion only when readiness is ready", () => {
    expect(courseReadinessEnrollmentCompletionGateV1("ready")).toEqual({
      status: "allowed"
    });
  });

  it("fails closed on insufficient evidence", () => {
    expect(
      courseReadinessEnrollmentCompletionGateV1("insufficient_evidence")
    ).toEqual({
      status: "blocked",
      reason: "insufficient_evidence"
    });
  });

  it("fails closed on definitive not-ready state", () => {
    expect(courseReadinessEnrollmentCompletionGateV1("not_ready")).toEqual({
      status: "blocked",
      reason: "not_ready"
    });
  });

  it("pins the v1 gate identity", () => {
    expect(ENROLLMENT_COMPLETION_GATE_POLICY).toEqual({
      key: "course-readiness-enrollment-completion",
      version: 1
    });
  });
});
