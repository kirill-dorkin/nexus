import { describe, expect, it } from "vitest";

import type {
  OrderedMasteryActivity,
  OrderedMasterySkill
} from "./ordered-mastery.policy";
import {
  FIXED_INTERVAL_REVIEW_POLICY,
  orderedMasteryWithFixedReviewV1,
  type ReviewAwareOrderedMasterySkill
} from "./fixed-interval-review.policy";

const EVALUATED_AT = "2026-09-17T12:00:00.000Z";

function skill(
  skillId: string,
  position: number,
  masteryScore: number | null,
  lastEvidenceAt: string | null
): ReviewAwareOrderedMasterySkill {
  return {
    skillId,
    title: `Skill ${skillId}`,
    position,
    masteryScore,
    lastEvidenceAt
  };
}

function baselineSkill(
  skillId: string,
  position: number,
  masteryScore: number | null
): OrderedMasterySkill {
  return {
    skillId,
    title: `Skill ${skillId}`,
    position,
    masteryScore
  };
}

function activity(
  activityId: string,
  skillId: string,
  position: number,
  attemptCount: number
): OrderedMasteryActivity {
  return {
    activityVersionId: `version-${activityId}`,
    activityId,
    slug: `activity-${activityId}`,
    activityType: "test.manual",
    title: `Activity ${activityId}`,
    position,
    skillIds: [skillId],
    attemptCount
  };
}

describe("fixed-interval-review@1", () => {
  it("pins the review policy configuration", () => {
    expect(FIXED_INTERVAL_REVIEW_POLICY).toEqual({
      key: "fixed-interval-review",
      version: 1,
      intervalDays: 7
    });
  });

  it("preserves ordered-mastery@1 while any skill remains below target", () => {
    const decision = orderedMasteryWithFixedReviewV1({
      evaluatedAt: EVALUATED_AT,
      skills: [
        skill("mastered", 0, 1, "2026-08-01T00:00:00.000Z"),
        skill("gap", 1, 0.5, "2026-09-16T00:00:00.000Z")
      ],
      activities: [activity("gap-practice", "gap", 0, 2)]
    });

    expect(decision).toMatchObject({
      status: "recommended",
      activity: { activityId: "gap-practice" },
      focusSkill: { skillId: "gap", masteryScore: 0.5 },
      reason: {
        code: "focus_skill_below_target",
        attemptCount: 2
      }
    });
  });

  it("returns the earliest scheduled review when mastery is met and nothing is due", () => {
    const decision = orderedMasteryWithFixedReviewV1({
      evaluatedAt: EVALUATED_AT,
      skills: [
        skill("later", 1, 1, "2026-09-16T00:00:00.000Z"),
        skill("earlier", 0, 0.8, "2026-09-15T00:00:00.000Z")
      ],
      activities: []
    });

    expect(decision).toEqual({
      status: "mastery_target_met",
      nextReviewAt: "2026-09-22T00:00:00.000Z"
    });
  });

  it("recommends the most overdue review with machine-readable timing", () => {
    const decision = orderedMasteryWithFixedReviewV1({
      evaluatedAt: EVALUATED_AT,
      skills: [
        skill("older", 1, 1, "2026-09-01T00:00:00.000Z"),
        skill("newer", 0, 1, "2026-09-05T00:00:00.000Z")
      ],
      activities: [
        activity("older-often", "older", 0, 3),
        activity("older-fresh", "older", 1, 1),
        activity("newer-practice", "newer", 0, 0)
      ]
    });

    expect(decision).toMatchObject({
      status: "recommended",
      activity: { activityId: "older-fresh" },
      focusSkill: { skillId: "older", masteryScore: 1 },
      reason: {
        code: "focus_skill_review_due",
        attemptCount: 1,
        lastEvidenceAt: "2026-09-01T00:00:00.000Z",
        reviewDueAt: "2026-09-08T00:00:00.000Z"
      }
    });
  });

  it("uses skill position and stable id when review due times tie", () => {
    const byPosition = orderedMasteryWithFixedReviewV1({
      evaluatedAt: EVALUATED_AT,
      skills: [
        skill("later", 2, 1, "2026-09-01T00:00:00.000Z"),
        skill("earlier", 1, 1, "2026-09-01T00:00:00.000Z")
      ],
      activities: [activity("earlier-practice", "earlier", 0, 0)]
    });
    expect(byPosition).toMatchObject({
      status: "recommended",
      focusSkill: { skillId: "earlier" }
    });

    const byId = orderedMasteryWithFixedReviewV1({
      evaluatedAt: EVALUATED_AT,
      skills: [
        skill("skill-b", 1, 1, "2026-09-01T00:00:00.000Z"),
        skill("skill-a", 1, 1, "2026-09-01T00:00:00.000Z")
      ],
      activities: [activity("a-practice", "skill-a", 0, 0)]
    });
    expect(byId).toMatchObject({
      status: "recommended",
      focusSkill: { skillId: "skill-a" }
    });
  });

  it("explains when a due review has no practice activity", () => {
    expect(
      orderedMasteryWithFixedReviewV1({
        evaluatedAt: EVALUATED_AT,
        skills: [skill("focus", 0, 1, "2026-09-01T00:00:00.000Z")],
        activities: []
      })
    ).toEqual({
      status: "no_practice_activity_available",
      focusSkill: {
        skillId: "focus",
        title: "Skill focus",
        masteryScore: 1,
        targetMasteryScore: 0.8
      },
      reason: {
        code: "no_practice_activity_available",
        lastEvidenceAt: "2026-09-01T00:00:00.000Z",
        reviewDueAt: "2026-09-08T00:00:00.000Z"
      }
    });
  });

  it("requires a review timestamp for every mastered skill", () => {
    expect(() =>
      orderedMasteryWithFixedReviewV1({
        evaluatedAt: EVALUATED_AT,
        skills: [skill("focus", 0, 1, null)],
        activities: []
      })
    ).toThrow("must have lastEvidenceAt");
  });

  it("keeps ordered-mastery@1 input compatibility explicit", () => {
    expect(baselineSkill("baseline", 0, 0.5)).toEqual({
      skillId: "baseline",
      title: "Skill baseline",
      position: 0,
      masteryScore: 0.5
    });
  });
});
