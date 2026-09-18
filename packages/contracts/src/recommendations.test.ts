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

function misconceptionContext() {
  return {
    ...reviewContext(),
    misconceptionSignalPolicy: {
      key: "repeated-trusted-failure",
      version: 1,
      minimumConsecutiveFailures: 2
    }
  };
}

function interventionContext() {
  return {
    ...misconceptionContext(),
    interventionPolicy: {
      key: "repeated-failure-remediation",
      version: 1
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

  it("accepts a suspected repeated-trusted-failure signal without changing the action reason", () => {
    const skillId = randomUUID();
    const parsed = nextLearningRecommendationSchema.parse({
      status: "recommended",
      ...misconceptionContext(),
      recommendation: {
        kind: "activity",
        activity: {
          activityVersionId: randomUUID(),
          activityId: randomUUID(),
          slug: "grid-retry",
          activityType: "pern.code-project",
          title: "Retry grid practice"
        },
        focusSkill: {
          skillId,
          title: "CSS Grid",
          masteryScore: 0,
          targetMasteryScore: 0.8
        },
        reason: {
          code: "focus_skill_below_target",
          attemptCount: 2
        },
        misconceptionSignal: {
          status: "suspected",
          code: "repeated_trusted_failure",
          skillId,
          consecutiveFailureCount: 2,
          firstObservedAt: "2026-09-10T00:00:00.000Z",
          lastObservedAt: "2026-09-11T00:00:00.000Z"
        }
      }
    });

    expect(parsed).toMatchObject({
      misconceptionSignalPolicy: {
        key: "repeated-trusted-failure",
        version: 1,
        minimumConsecutiveFailures: 2
      },
      recommendation: {
        reason: { code: "focus_skill_below_target" },
        misconceptionSignal: {
          status: "suspected",
          code: "repeated_trusted_failure",
          skillId,
          consecutiveFailureCount: 2
        }
      }
    });
  });

  it("accepts an explainable remediation intervention with the active signal", () => {
    const skillId = randomUUID();
    const selectedActivityVersionId = randomUUID();
    const replacedActivityVersionId = randomUUID();
    const parsed = nextLearningRecommendationSchema.parse({
      status: "recommended",
      ...interventionContext(),
      recommendation: {
        kind: "activity",
        activity: {
          activityVersionId: selectedActivityVersionId,
          activityId: randomUUID(),
          slug: "grid-remediation",
          activityType: "pern.code-project",
          title: "Targeted grid remediation"
        },
        focusSkill: {
          skillId,
          title: "CSS Grid",
          masteryScore: 0,
          targetMasteryScore: 0.8
        },
        reason: {
          code: "focus_skill_below_target",
          attemptCount: 0
        },
        misconceptionSignal: {
          status: "suspected",
          code: "repeated_trusted_failure",
          skillId,
          consecutiveFailureCount: 2,
          firstObservedAt: "2026-09-10T00:00:00.000Z",
          lastObservedAt: "2026-09-11T00:00:00.000Z"
        },
        intervention: {
          code: "repeated_trusted_failure_remediation",
          signalCode: "repeated_trusted_failure",
          replacedActivityVersionId,
          remediationPosition: 0
        }
      }
    });

    expect(parsed).toMatchObject({
      interventionPolicy: {
        key: "repeated-failure-remediation",
        version: 1
      },
      recommendation: {
        activity: {
          activityVersionId: selectedActivityVersionId
        },
        intervention: {
          code: "repeated_trusted_failure_remediation",
          replacedActivityVersionId
        }
      }
    });
  });

  it("rejects an intervention without its active misconception signal", () => {
    expect(() =>
      nextLearningRecommendationSchema.parse({
        status: "recommended",
        ...interventionContext(),
        recommendation: {
          kind: "activity",
          activity: {
            activityVersionId: randomUUID(),
            activityId: randomUUID(),
            slug: "grid-remediation",
            activityType: "pern.code-project",
            title: "Targeted grid remediation"
          },
          focusSkill: {
            skillId: randomUUID(),
            title: "CSS Grid",
            masteryScore: 0,
            targetMasteryScore: 0.8
          },
          reason: {
            code: "focus_skill_below_target",
            attemptCount: 0
          },
          misconceptionSignal: null,
          intervention: {
            code: "repeated_trusted_failure_remediation",
            signalCode: "repeated_trusted_failure",
            replacedActivityVersionId: randomUUID(),
            remediationPosition: 0
          }
        }
      })
    ).toThrow();
  });

  it("rejects an intervention signal for a different focus skill", () => {
    const focusSkillId = randomUUID();
    expect(() =>
      nextLearningRecommendationSchema.parse({
        status: "recommended",
        ...interventionContext(),
        recommendation: {
          kind: "activity",
          activity: {
            activityVersionId: randomUUID(),
            activityId: randomUUID(),
            slug: "grid-remediation",
            activityType: "pern.code-project",
            title: "Targeted grid remediation"
          },
          focusSkill: {
            skillId: focusSkillId,
            title: "CSS Grid",
            masteryScore: 0,
            targetMasteryScore: 0.8
          },
          reason: {
            code: "focus_skill_below_target",
            attemptCount: 0
          },
          misconceptionSignal: {
            status: "suspected",
            code: "repeated_trusted_failure",
            skillId: randomUUID(),
            consecutiveFailureCount: 2,
            firstObservedAt: "2026-09-10T00:00:00.000Z",
            lastObservedAt: "2026-09-11T00:00:00.000Z"
          },
          intervention: {
            code: "repeated_trusted_failure_remediation",
            signalCode: "repeated_trusted_failure",
            replacedActivityVersionId: randomUUID(),
            remediationPosition: 0
          }
        }
      })
    ).toThrow();
  });

  it("rejects a suspected signal below the policy minimum", () => {
    const skillId = randomUUID();
    expect(() =>
      nextLearningRecommendationSchema.parse({
        status: "recommended",
        ...misconceptionContext(),
        recommendation: {
          kind: "activity",
          activity: {
            activityVersionId: randomUUID(),
            activityId: randomUUID(),
            slug: "grid-retry",
            activityType: "pern.code-project",
            title: "Retry grid practice"
          },
          focusSkill: {
            skillId,
            title: "CSS Grid",
            masteryScore: 0,
            targetMasteryScore: 0.8
          },
          reason: {
            code: "focus_skill_below_target",
            attemptCount: 1
          },
          misconceptionSignal: {
            status: "suspected",
            code: "repeated_trusted_failure",
            skillId,
            consecutiveFailureCount: 1,
            firstObservedAt: "2026-09-10T00:00:00.000Z",
            lastObservedAt: "2026-09-10T00:00:00.000Z"
          }
        }
      })
    ).toThrow();
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

    expect(parsed).toMatchObject({
      status: "no_practice_activity_available",
      reason: {
        code: "no_practice_activity_available",
        reviewDueAt: "2026-09-08T00:00:00.000Z"
      }
    });
  });
});
