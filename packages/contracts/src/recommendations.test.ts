import { randomUUID } from "node:crypto";

import { describe, expect, it } from "vitest";

import { nextLearningRecommendationSchema } from "./recommendations";

function context() {
  return {
    enrollmentId: randomUUID(),
    offeringId: randomUUID(),
    courseVersionId: randomUUID(),
    policy: {
      key: "ordered-mastery",
      version: 1,
      masteryTarget: 0.8
    }
  };
}

function reviewContext() {
  return {
    ...context(),
    reviewPolicy: {
      key: "fixed-interval-review",
      version: 1,
      intervalDays: 7
    }
  };
}

describe("recommendation contracts", () => {
  it("accepts an explainable activity recommendation", () => {
    const parsed = nextLearningRecommendationSchema.parse({
      status: "recommended",
      ...context(),
      recommendation: {
        kind: "activity",
        activity: {
          activityVersionId: randomUUID(),
          activityId: randomUUID(),
          slug: "grid-practice",
          activityType: "pern.code-project",
          title: "Grid practice"
        },
        focusSkill: {
          skillId: randomUUID(),
          title: "CSS Grid",
          masteryScore: 0.4,
          targetMasteryScore: 0.8
        },
        reason: {
          code: "focus_skill_below_target",
          attemptCount: 2
        }
      }
    });

    expect(parsed).toMatchObject({
      status: "recommended",
      policy: {
        key: "ordered-mastery",
        version: 1,
        masteryTarget: 0.8
      },
      recommendation: {
        reason: {
          code: "focus_skill_below_target",
          attemptCount: 2
        }
      }
    });
  });

  it("accepts an explainable due-review recommendation", () => {
    const parsed = nextLearningRecommendationSchema.parse({
      status: "recommended",
      ...reviewContext(),
      recommendation: {
        kind: "activity",
        activity: {
          activityVersionId: randomUUID(),
          activityId: randomUUID(),
          slug: "grid-review",
          activityType: "pern.code-project",
          title: "Grid review"
        },
        focusSkill: {
          skillId: randomUUID(),
          title: "CSS Grid",
          masteryScore: 1,
          targetMasteryScore: 0.8
        },
        reason: {
          code: "focus_skill_review_due",
          attemptCount: 1,
          lastEvidenceAt: "2026-09-01T00:00:00.000Z",
          reviewDueAt: "2026-09-08T00:00:00.000Z"
        }
      }
    });

    expect(parsed).toMatchObject({
      reviewPolicy: {
        key: "fixed-interval-review",
        version: 1,
        intervalDays: 7
      },
      recommendation: {
        reason: {
          code: "focus_skill_review_due",
          reviewDueAt: "2026-09-08T00:00:00.000Z"
        }
      }
    });
  });

  it("keeps mastery target met distinct from course completion", () => {
    const parsed = nextLearningRecommendationSchema.parse({
      status: "mastery_target_met",
      ...reviewContext(),
      nextReviewAt: "2026-09-22T00:00:00.000Z",
      recommendation: null
    });

    expect(parsed).toMatchObject({
      status: "mastery_target_met",
      nextReviewAt: "2026-09-22T00:00:00.000Z",
      recommendation: null
    });
  });

  it("represents a focus skill with no practice activity as a structured outcome", () => {
    const parsed = nextLearningRecommendationSchema.parse({
      status: "no_practice_activity_available",
      ...context(),
      focusSkill: {
        skillId: randomUUID(),
        title: "Transactions",
        masteryScore: null,
        targetMasteryScore: 0.8
      },
      reason: { code: "no_practice_activity_available" },
      recommendation: null
    });

    expect(parsed).toMatchObject({
      status: "no_practice_activity_available",
      reason: { code: "no_practice_activity_available" },
      recommendation: null
    });
  });

  it("preserves review timing when a due skill has no practice activity", () => {
    const parsed = nextLearningRecommendationSchema.parse({
      status: "no_practice_activity_available",
      ...reviewContext(),
      focusSkill: {
        skillId: randomUUID(),
        title: "Transactions",
        masteryScore: 1,
        targetMasteryScore: 0.8
      },
      reason: {
        code: "no_practice_activity_available",
        lastEvidenceAt: "2026-09-01T00:00:00.000Z",
        reviewDueAt: "2026-09-08T00:00:00.000Z"
      },
      recommendation: null
    });

    expect(parsed.reason).toMatchObject({
      code: "no_practice_activity_available",
      reviewDueAt: "2026-09-08T00:00:00.000Z"
    });
  });
});
