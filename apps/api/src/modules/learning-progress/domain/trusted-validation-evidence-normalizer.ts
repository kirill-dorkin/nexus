import type {
  CourseVersionActivity,
  ValidationResult
} from "@platform/contracts";

export type NormalizedValidationEvidence = Readonly<{
  skillId: string;
  kind: string;
  score: number;
  payload: Readonly<Record<string, unknown>>;
}>;

export function normalizeTrustedValidationResult(
  result: ValidationResult,
  activity: CourseVersionActivity
): readonly NormalizedValidationEvidence[] {
  if (result.activityVersionId !== activity.id) {
    throw new Error(
      "ValidationResult must match the exact ActivityVersion being normalized."
    );
  }

  if (result.status !== "completed" || result.evidenceTrust !== "trusted") {
    return [];
  }

  if (result.outcome !== "passed" && result.outcome !== "failed") {
    return [];
  }

  const score = result.score ?? (result.outcome === "passed" ? 1 : 0);

  return activity.skillIds.map((skillId) => ({
    skillId,
    kind: activity.activityType,
    score,
    payload: { outcome: result.outcome }
  }));
}
