import {
  ORDERED_MASTERY_POLICY,
  orderedMasteryV1,
  type OrderedMasteryActivity,
  type OrderedMasteryDecision,
  type OrderedMasteryFocusSkill,
  type OrderedMasterySkill
} from "./ordered-mastery.policy";

const DAY_MS = 24 * 60 * 60 * 1_000;

export const FIXED_INTERVAL_REVIEW_POLICY = {
  key: "fixed-interval-review",
  version: 1,
  intervalDays: 7
} as const;

export type ReviewAwareOrderedMasterySkill = OrderedMasterySkill &
  Readonly<{
    lastEvidenceAt: string | null;
  }>;

type BaselineRecommendationDecision = Exclude<
  OrderedMasteryDecision,
  Readonly<{ status: "mastery_target_met" }>
>;

export type ReviewAwareOrderedMasteryDecision =
  | BaselineRecommendationDecision
  | Readonly<{
      status: "recommended";
      activity: OrderedMasteryActivity;
      focusSkill: OrderedMasteryFocusSkill;
      reason: Readonly<{
        code: "focus_skill_review_due";
        attemptCount: number;
        lastEvidenceAt: string;
        reviewDueAt: string;
      }>;
    }>
  | Readonly<{
      status: "mastery_target_met";
      nextReviewAt: string | null;
    }>
  | Readonly<{
      status: "no_practice_activity_available";
      focusSkill: OrderedMasteryFocusSkill;
      reason: Readonly<{
        code: "no_practice_activity_available";
        lastEvidenceAt: string;
        reviewDueAt: string;
      }>;
    }>;

export type ReviewAwareOrderedMasteryInput = Readonly<{
  evaluatedAt: string;
  skills: readonly ReviewAwareOrderedMasterySkill[];
  activities: readonly OrderedMasteryActivity[];
}>;

type ReviewCandidate = Readonly<{
  skill: ReviewAwareOrderedMasterySkill;
  lastEvidenceAt: string;
  reviewDueAt: string;
  reviewDueAtMs: number;
}>;

function compareStableId(left: string, right: string): number {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
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

function parseInstant(value: string, label: string): number {
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) {
    throw new Error(`${label} must be a valid ISO-8601 instant.`);
  }
  return parsed;
}

function reviewCandidate(
  skill: ReviewAwareOrderedMasterySkill
): ReviewCandidate {
  if (skill.lastEvidenceAt === null) {
    throw new Error(
      `Mastered skill ${skill.skillId} must have lastEvidenceAt for review scheduling.`
    );
  }

  const lastEvidenceAtMs = parseInstant(
    skill.lastEvidenceAt,
    `lastEvidenceAt for skill ${skill.skillId}`
  );
  const reviewDueAtMs =
    lastEvidenceAtMs + FIXED_INTERVAL_REVIEW_POLICY.intervalDays * DAY_MS;

  return {
    skill,
    lastEvidenceAt: new Date(lastEvidenceAtMs).toISOString(),
    reviewDueAt: new Date(reviewDueAtMs).toISOString(),
    reviewDueAtMs
  };
}

function compareReviewCandidates(
  left: ReviewCandidate,
  right: ReviewCandidate
): number {
  return (
    left.reviewDueAtMs - right.reviewDueAtMs ||
    left.skill.position - right.skill.position ||
    compareStableId(left.skill.skillId, right.skill.skillId)
  );
}

export function orderedMasteryWithFixedReviewV1(
  input: ReviewAwareOrderedMasteryInput
): ReviewAwareOrderedMasteryDecision {
  const baseline = orderedMasteryV1({
    skills: input.skills,
    activities: input.activities
  });

  if (baseline.status !== "mastery_target_met") {
    return baseline;
  }

  const evaluatedAtMs = parseInstant(input.evaluatedAt, "evaluatedAt");
  const candidates = input.skills
    .map((skill) => {
      if (
        skill.masteryScore === null ||
        skill.masteryScore < ORDERED_MASTERY_POLICY.masteryTarget
      ) {
        throw new Error(
          "Review scheduling requires the ordered-mastery baseline target to be met."
        );
      }
      return reviewCandidate(skill);
    })
    .sort(compareReviewCandidates);

  const focus = candidates[0];
  if (focus === undefined) {
    return {
      status: "mastery_target_met",
      nextReviewAt: null
    };
  }

  if (focus.reviewDueAtMs > evaluatedAtMs) {
    return {
      status: "mastery_target_met",
      nextReviewAt: focus.reviewDueAt
    };
  }

  const focusSkill: OrderedMasteryFocusSkill = {
    skillId: focus.skill.skillId,
    title: focus.skill.title,
    masteryScore: focus.skill.masteryScore,
    targetMasteryScore: ORDERED_MASTERY_POLICY.masteryTarget
  };
  const activity = [...input.activities]
    .filter((candidate) => candidate.skillIds.includes(focus.skill.skillId))
    .sort(compareActivities)[0];

  if (activity === undefined) {
    return {
      status: "no_practice_activity_available",
      focusSkill,
      reason: {
        code: "no_practice_activity_available",
        lastEvidenceAt: focus.lastEvidenceAt,
        reviewDueAt: focus.reviewDueAt
      }
    };
  }

  return {
    status: "recommended",
    activity,
    focusSkill,
    reason: {
      code: "focus_skill_review_due",
      attemptCount: activity.attemptCount,
      lastEvidenceAt: focus.lastEvidenceAt,
      reviewDueAt: focus.reviewDueAt
    }
  };
}
