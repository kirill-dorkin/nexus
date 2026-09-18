import { describe, expect, it } from "vitest";

import type { ReviewAwareOrderedMasteryDecision } from "./fixed-interval-review.policy";
import type { RepeatedTrustedFailureSignal } from "./misconception-signal.policy";
import type { OrderedMasteryActivity } from "./ordered-mastery.policy";
import {
  REPEATED_FAILURE_REMEDIATION_POLICY,
  applyRepeatedFailureRemediationV1
} from "./repeated-failure-remediation.policy";

const baselineActivity: OrderedMasteryActivity = {
  activityVersionId: "version-baseline",
  activityId: "activity-baseline",
  slug: "baseline",
  activityType: "practice",
  title: "Baseline",
  position: 0,
  skillIds: ["skill-a"],
  attemptCount: 2
};

const remediationA: OrderedMasteryActivity = {
  activityVersionId: "version-remediation-a",
  activityId: "activity-remediation-a",
  slug: "remediation-a",
  activityType: "practice",
  title: "Remediation A",
  position: 1,
  skillIds: ["skill-a"],
  attemptCount: 0
};

const remediationB: OrderedMasteryActivity = {
  activityVersionId: "version-remediation-b",
  activityId: "activity-remediation-b",
  slug: "remediation-b",
  activityType: "practice",
  title: "Remediation B",
  position: 2,
  skillIds: ["skill-a"],
  attemptCount: 0
};

const baseline: Extract<
  ReviewAwareOrderedMasteryDecision,
  { status: "recommended" }
> = {
  status: "recommended",
  activity: baselineActivity,
  focusSkill: {
    skillId: "skill-a",
    title: "Skill A",
    masteryScore: 0.2,
    targetMasteryScore: 0.8
  },
  reason: {
    code: "focus_skill_below_target",
    attemptCount: baselineActivity.attemptCount
  }
};

const signal: RepeatedTrustedFailureSignal = {
  status: "suspected",
  code: "repeated_trusted_failure",
  skillId: "skill-a",
  consecutiveFailureCount: 2,
  firstObservedAt: "2026-09-10T00:00:00.000Z",
  lastObservedAt: "2026-09-11T00:00:00.000Z"
};

describe("repeated-failure-remediation@1", () => {
  it("exposes stable policy identity", () => {
    expect(REPEATED_FAILURE_REMEDIATION_POLICY).toEqual({
      key: "repeated-failure-remediation",
      version: 1
    });
  });

  it("preserves the baseline when no signal is active", () => {
    expect(
      applyRepeatedFailureRemediationV1({
        baseline,
        signal: null,
        remediations: [
          { skillId: "skill-a", activityId: remediationA.activityId, position: 0 }
        ],
        activities: [baselineActivity, remediationA]
      })
    ).toEqual(baseline);
  });

  it("preserves the baseline when no alternate authored remediation exists", () => {
    expect(
      applyRepeatedFailureRemediationV1({
        baseline,
        signal,
        remediations: [
          { skillId: "skill-a", activityId: baselineActivity.activityId, position: 0 }
        ],
        activities: [baselineActivity]
      })
    ).toEqual(baseline);
  });

  it("overrides the activity with an authored remediation and explains the action change", () => {
    const decision = applyRepeatedFailureRemediationV1({
      baseline,
      signal,
      remediations: [
        { skillId: "skill-a", activityId: remediationA.activityId, position: 0 }
      ],
      activities: [baselineActivity, remediationA]
    });

    expect(decision).toMatchObject({
      status: "recommended",
      activity: {
        activityVersionId: remediationA.activityVersionId,
        activityId: remediationA.activityId
      },
      reason: {
        code: "focus_skill_below_target",
        attemptCount: 0
      },
      intervention: {
        code: "repeated_trusted_failure_remediation",
        signalCode: "repeated_trusted_failure",
        replacedActivityVersionId: baselineActivity.activityVersionId,
        remediationPosition: 0
      }
    });
  });

  it("prefers the least-attempted remediation before authored position", () => {
    const attemptedA = { ...remediationA, attemptCount: 2 };
    const decision = applyRepeatedFailureRemediationV1({
      baseline,
      signal,
      remediations: [
        { skillId: "skill-a", activityId: attemptedA.activityId, position: 0 },
        { skillId: "skill-a", activityId: remediationB.activityId, position: 1 }
      ],
      activities: [baselineActivity, attemptedA, remediationB]
    });

    expect(decision.activity.activityId).toBe(remediationB.activityId);
  });

  it("uses authored position and then stable activity id for deterministic ties", () => {
    const samePositionA = { ...remediationA, attemptCount: 0 };
    const samePositionB = { ...remediationB, attemptCount: 0 };
    const decision = applyRepeatedFailureRemediationV1({
      baseline,
      signal,
      remediations: [
        { skillId: "skill-a", activityId: samePositionB.activityId, position: 1 },
        { skillId: "skill-a", activityId: samePositionA.activityId, position: 0 }
      ],
      activities: [baselineActivity, samePositionA, samePositionB]
    });

    expect(decision.activity.activityId).toBe(samePositionA.activityId);
  });

  it("preserves review timing while updating the selected activity attempt count", () => {
    const reviewBaseline: Extract<
      ReviewAwareOrderedMasteryDecision,
      { status: "recommended" }
    > = {
      ...baseline,
      reason: {
        code: "focus_skill_review_due",
        attemptCount: baselineActivity.attemptCount,
        lastEvidenceAt: "2026-09-01T00:00:00.000Z",
        reviewDueAt: "2026-09-08T00:00:00.000Z"
      }
    };
    const decision = applyRepeatedFailureRemediationV1({
      baseline: reviewBaseline,
      signal,
      remediations: [
        { skillId: "skill-a", activityId: remediationA.activityId, position: 0 }
      ],
      activities: [baselineActivity, remediationA]
    });

    expect(decision.reason).toEqual({
      code: "focus_skill_review_due",
      attemptCount: 0,
      lastEvidenceAt: "2026-09-01T00:00:00.000Z",
      reviewDueAt: "2026-09-08T00:00:00.000Z"
    });
  });

  it("fails closed when composition supplies a signal for another skill", () => {
    expect(() =>
      applyRepeatedFailureRemediationV1({
        baseline,
        signal: { ...signal, skillId: "skill-b" },
        remediations: [],
        activities: [baselineActivity]
      })
    ).toThrow(
      "Remediation signal skill must match the baseline recommendation focus skill."
    );
  });
});
