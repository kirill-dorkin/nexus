import type {
  ReviewAwareOrderedMasteryDecision
} from "./fixed-interval-review.policy";
import type { RepeatedTrustedFailureSignal } from "./misconception-signal.policy";
import type { OrderedMasteryActivity } from "./ordered-mastery.policy";

export const REPEATED_FAILURE_REMEDIATION_POLICY = Object.freeze({
  key: "repeated-failure-remediation",
  version: 1
});

export type SkillRemediationRelation = Readonly<{
  skillId: string;
  activityId: string;
  position: number;
}>;

type BaselineRecommendedDecision = Extract<
  ReviewAwareOrderedMasteryDecision,
  Readonly<{ status: "recommended" }>
>;

export type RemediationIntervention = Readonly<{
  code: "repeated_trusted_failure_remediation";
  signalCode: "repeated_trusted_failure";
  replacedActivityVersionId: string;
  remediationPosition: number;
}>;

export type RemediationAwareRecommendedDecision = Readonly<{
  status: "recommended";
  activity: OrderedMasteryActivity;
  focusSkill: BaselineRecommendedDecision["focusSkill"];
  reason: BaselineRecommendedDecision["reason"];
  intervention?: RemediationIntervention;
}>;

export type RepeatedFailureRemediationInput = Readonly<{
  baseline: BaselineRecommendedDecision;
  signal: RepeatedTrustedFailureSignal | null;
  remediations: readonly SkillRemediationRelation[];
  activities: readonly OrderedMasteryActivity[];
}>;

function compareStableId(left: string, right: string): number {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

function withAttemptCount(
  reason: BaselineRecommendedDecision["reason"],
  attemptCount: number
): BaselineRecommendedDecision["reason"] {
  switch (reason.code) {
    case "focus_skill_unobserved":
      return { code: reason.code, attemptCount };
    case "focus_skill_below_target":
      return { code: reason.code, attemptCount };
    case "focus_skill_review_due":
      return {
        code: reason.code,
        attemptCount,
        lastEvidenceAt: reason.lastEvidenceAt,
        reviewDueAt: reason.reviewDueAt
      };
  }
}

export function applyRepeatedFailureRemediationV1(
  input: RepeatedFailureRemediationInput
): RemediationAwareRecommendedDecision {
  if (input.signal === null) {
    return input.baseline;
  }

  const signal = input.signal;

  if (signal.skillId !== input.baseline.focusSkill.skillId) {
    throw new Error(
      "Remediation signal skill must match the baseline recommendation focus skill."
    );
  }

  const candidates = input.remediations
    .filter(
      (remediation) =>
        remediation.skillId === signal.skillId &&
        remediation.activityId !== input.baseline.activity.activityId
    )
    .map((remediation) => {
      const activity = input.activities.find(
        (candidate) => candidate.activityId === remediation.activityId
      );
      if (activity === undefined) {
        throw new Error(
          `Published remediation activity ${remediation.activityId} is missing from the recommendation graph.`
        );
      }
      if (!activity.skillIds.includes(signal.skillId)) {
        throw new Error(
          `Published remediation activity ${remediation.activityId} does not assess the signal skill.`
        );
      }
      return { remediation, activity };
    })
    .sort(
      (left, right) =>
        left.activity.attemptCount - right.activity.attemptCount ||
        left.remediation.position - right.remediation.position ||
        compareStableId(left.activity.activityId, right.activity.activityId)
    );

  const selected = candidates[0];
  if (selected === undefined) {
    return input.baseline;
  }

  return {
    ...input.baseline,
    activity: selected.activity,
    reason: withAttemptCount(
      input.baseline.reason,
      selected.activity.attemptCount
    ),
    intervention: {
      code: "repeated_trusted_failure_remediation",
      signalCode: signal.code,
      replacedActivityVersionId: input.baseline.activity.activityVersionId,
      remediationPosition: selected.remediation.position
    }
  };
}
