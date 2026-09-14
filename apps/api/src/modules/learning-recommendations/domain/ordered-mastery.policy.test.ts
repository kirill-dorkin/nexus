import { describe, expect, it } from "vitest";

import {
  ORDERED_MASTERY_POLICY,
  orderedMasteryV1,
  type OrderedMasteryActivity,
  type OrderedMasterySkill
} from "./ordered-mastery.policy";

function skill(
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

describe("ordered-mastery@1", () => {
  it("pins the v1 policy configuration", () => {
    expect(ORDERED_MASTERY_POLICY).toEqual({
      key: "ordered-mastery",
      version: 1,
      masteryTarget: 0.8
    });
  });

  it("chooses the earliest positioned unobserved skill regardless of input order", () => {
    const decision = orderedMasteryV1({
      skills: [skill("later", 10, null), skill("first", 0, null)],
      activities: [activity("first-practice", "first", 0, 0)]
    });

    expect(decision).toMatchObject({
      status: "recommended",
      focusSkill: {
        skillId: "first",
        masteryScore: null,
        targetMasteryScore: 0.8
      },
      reason: {
        code: "focus_skill_unobserved",
        attemptCount: 0
      }
    });
  });

  it("uses stable skill id as the tie-breaker for equal positions", () => {
    const decision = orderedMasteryV1({
      skills: [skill("skill-b", 0, null), skill("skill-a", 0, null)],
      activities: [activity("practice-a", "skill-a", 0, 0)]
    });

    expect(decision).toMatchObject({
      status: "recommended",
      focusSkill: { skillId: "skill-a" }
    });
  });

  it("skips mastery at or above target and focuses the next below-target skill", () => {
    const decision = orderedMasteryV1({
      skills: [skill("met", 0, 0.8), skill("focus", 1, 0.79)],
      activities: [activity("focus-practice", "focus", 0, 0)]
    });

    expect(decision).toMatchObject({
      status: "recommended",
      focusSkill: {
        skillId: "focus",
        masteryScore: 0.79
      },
      reason: { code: "focus_skill_below_target" }
    });
  });

  it("reports mastery_target_met without equating it to course completion", () => {
    expect(
      orderedMasteryV1({
        skills: [skill("one", 0, 0.8), skill("two", 1, 1)],
        activities: []
      })
    ).toEqual({ status: "mastery_target_met" });
  });

  it("reports no practice activity for the selected focus skill", () => {
    const decision = orderedMasteryV1({
      skills: [skill("focus", 0, null)],
      activities: [activity("unrelated", "other", 0, 0)]
    });

    expect(decision).toEqual({
      status: "no_practice_activity_available",
      focusSkill: {
        skillId: "focus",
        title: "Skill focus",
        masteryScore: null,
        targetMasteryScore: 0.8
      },
      reason: { code: "no_practice_activity_available" }
    });
  });

  it("prefers the activity with the lowest attempt count", () => {
    const decision = orderedMasteryV1({
      skills: [skill("focus", 0, null)],
      activities: [
        activity("often-tried", "focus", 0, 3),
        activity("fresh", "focus", 99, 1)
      ]
    });

    expect(decision).toMatchObject({
      status: "recommended",
      activity: { activityId: "fresh" },
      reason: { attemptCount: 1 }
    });
  });

  it("uses activity position and then stable activity id as deterministic tie-breakers", () => {
    const byPosition = orderedMasteryV1({
      skills: [skill("focus", 0, null)],
      activities: [
        activity("later", "focus", 2, 0),
        activity("earlier", "focus", 1, 0)
      ]
    });
    expect(byPosition).toMatchObject({
      status: "recommended",
      activity: { activityId: "earlier" }
    });

    const byId = orderedMasteryV1({
      skills: [skill("focus", 0, null)],
      activities: [
        activity("activity-b", "focus", 1, 0),
        activity("activity-a", "focus", 1, 0)
      ]
    });
    expect(byId).toMatchObject({
      status: "recommended",
      activity: { activityId: "activity-a" }
    });
  });

  it("does not mutate caller-owned skill or activity ordering", () => {
    const skills = [skill("b", 1, null), skill("a", 0, null)];
    const activities = [
      activity("b", "a", 1, 0),
      activity("a", "a", 0, 0)
    ];
    const originalSkillOrder = skills.map((item) => item.skillId);
    const originalActivityOrder = activities.map((item) => item.activityId);

    orderedMasteryV1({ skills, activities });

    expect(skills.map((item) => item.skillId)).toEqual(originalSkillOrder);
    expect(activities.map((item) => item.activityId)).toEqual(originalActivityOrder);
  });
});
