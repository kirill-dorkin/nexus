import type { CourseReadinessDecision } from "@platform/contracts";

export const ENROLLMENT_COMPLETION_GATE_POLICY = Object.freeze({
  key: "course-readiness-enrollment-completion",
  version: 1
});

export type EnrollmentCompletionGateDecision =
  | Readonly<{ status: "allowed" }>
  | Readonly<{
      status: "blocked";
      reason: Exclude<CourseReadinessDecision["status"], "ready">;
    }>;

export function courseReadinessEnrollmentCompletionGateV1(
  readinessStatus: CourseReadinessDecision["status"]
): EnrollmentCompletionGateDecision {
  if (readinessStatus === "ready") {
    return { status: "allowed" };
  }

  return {
    status: "blocked",
    reason: readinessStatus
  };
}
