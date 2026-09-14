export const ORDERED_MASTERY_POLICY = {
  key: "ordered-mastery",
  version: 1,
  masteryTarget: 0.8
} as const;

export type OrderedMasterySkill = Readonly<{
  skillId: string;
  title: string;
  position: number;
  masteryScore: number | null;
}>;

export type OrderedMasteryActivity = Readonly<{
  activityVersionId: string;
  activityId: string;
  slug: string;
  activityType: string;
  title: string;
  position: number;
  skillIds: readonly string[];
  attemptCount: number;
}>;

export type OrderedMasteryFocusSkill = Readonly<{
  skillId: string;
  title: string;
  masteryScore: number | null;
  targetMasteryScore: number;
}>;

export type OrderedMasteryDecision =
  | Readonly<{
      status: "recommended";
      activity: OrderedMasteryActivity;
      focusSkill: OrderedMasteryFocusSkill;
      reason: Readonly<{
        code: "focus_skill_unobserved" | "focus_skill_below_target";
        attemptCount: number;
      }>;
    }>
  | Readonly<{
      status: "mastery_target_met";
    }>
  | Readonly<{
      status: "no_practice_activity_available";
      focusSkill: OrderedMasteryFocusSkill;
      reason: Readonly<{
        code: "no_practice_activity_available";
      }>;
    }>;

export type OrderedMasteryInput = Readonly<{
  skills: readonly OrderedMasterySkill[];
  activities: readonly OrderedMasteryActivity[];
}>;

function compareStableId(left: string, right: string): number {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

function compareSkills(
  left: OrderedMasterySkill,
  right: OrderedMasterySkill
): number {
  return (
    left.position - right.position ||
    compareStableId(left.skillId, right.skillId)
  );
}

function compareActivities(
  left: OrderedMasteryActivity,
  right: OrderedMasteryActivity
): number {
  return (
    left.attemptCount - right.attemptCount ||
    left.position - right.position ||
    compareStableId(left.activityId, right.activityId)
  );
}

export function orderedMasteryV1(
  input: OrderedMasteryInput
): OrderedMasteryDecision {
  const focus = [...input.skills]
    .sort(compareSkills)
    .find(
      (skill) =>
        skill.masteryScore === null ||
        skill.masteryScore < ORDERED_MASTERY_POLICY.masteryTarget
    );

  if (focus === undefined) {
    return { status: "mastery_target_met" };
  }

  const focusSkill: OrderedMasteryFocusSkill = {
    skillId: focus.skillId,
    title: focus.title,
    masteryScore: focus.masteryScore,
    targetMasteryScore: ORDERED_MASTERY_POLICY.masteryTarget
  };

  const activity = [...input.activities]
    .filter((candidate) => candidate.skillIds.includes(focus.skillId))
    .sort(compareActivities)[0];

  if (activity === undefined) {
    return {
      status: "no_practice_activity_available",
      focusSkill,
      reason: { code: "no_practice_activity_available" }
    };
  }

  return {
    status: "recommended",
    activity,
    focusSkill,
    reason: {
      code:
        focus.masteryScore === null
          ? "focus_skill_unobserved"
          : "focus_skill_below_target",
      attemptCount: activity.attemptCount
    }
  };
}
