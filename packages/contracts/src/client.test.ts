import { describe, expect, it } from "vitest";

import { assignmentCheckResultSchema } from "./assignment";
import { identityUserSchema } from "./identity";
import { oauthProvidersResponseSchema } from "./authentication";
import {
  clientAssignmentCheckResultSchema,
  clientIdentityUserSchema,
  clientLearnerCourseSkillsSchema,
  clientLearnerLearningCourseSchema,
  clientOAuthProvidersResponseSchema,
  clientOwnLearningListSchema,
  clientQuizCheckResultSchema
} from "./client";
import {
  learnerCourseSkillsSchema,
  learnerLearningCourseSchema,
  ownLearningListSchema
} from "./learner-learning";
import { quizCheckResultSchema } from "./quiz-check";

// WP-6: the browser parses with zod/mini copies; they must agree with the full
// schemas on every sample, valid or not.

const id = "0194f6c2-1b2c-7d3e-8f40-123456789abc";
const at = "2026-11-04T10:00:00.000Z";

const course = {
  organization: { slug: "academy", name: "Академия" },
  offering: { slug: "html", name: "HTML" },
  course: {
    slug: "html",
    title: "HTML с нуля",
    description: "",
    lessons: [
      { slug: "start", title: "Старт", summary: "", durationMinutes: 10 },
      {
        slug: "next",
        title: "Дальше",
        summary: "",
        chapter: "Глава",
        durationMinutes: 5
      }
    ]
  },
  entry: {
    customerEntryPolicy: "open",
    membershipStatus: "active",
    enrollmentStatus: "active"
  },
  progress: {
    policyKey: "required-activity-passes",
    policyVersion: 2,
    passedRequired: 1,
    totalRequired: 2,
    percentage: 50,
    allRequiredPassed: false,
    nextLessonSlug: "next",
    lastActionAt: at,
    lessons: [
      {
        slug: "start",
        passedRequired: 1,
        totalRequired: 1,
        requiredPassed: true,
        activities: [{ slug: "q", passed: true }]
      }
    ]
  }
};

const skill = (extra: object) => ({
  skillId: id,
  title: "Заголовки",
  description: null,
  position: 0,
  ...extra
});

const pairs: [
  string,
  { safeParse(v: unknown): { success: boolean } },
  { safeParse(v: unknown): { success: boolean } },
  unknown[]
][] = [
  [
    "identity user",
    identityUserSchema,
    clientIdentityUserSchema,
    [
      { id, email: "a@example.test", displayName: null, status: "active" },
      {
        id,
        email: "a@example.test",
        displayName: "Аня",
        status: "deleted",
        extra: 1
      },
      { id, email: "not-an-email", displayName: null, status: "active" },
      { id: "x", email: "a@example.test", displayName: null, status: "active" },
      { id, email: "a@example.test", displayName: null, status: "unknown" }
    ]
  ],
  [
    "oauth providers",
    oauthProvidersResponseSchema,
    clientOAuthProvidersResponseSchema,
    [
      { providers: [] },
      { providers: ["google", "github"] },
      { providers: ["yandex"] },
      {}
    ]
  ],
  [
    "quiz result",
    quizCheckResultSchema,
    clientQuizCheckResultSchema,
    [
      { attemptNumber: 1, outcome: "passed", score: 1, feedback: "Да" },
      { attemptNumber: 0, outcome: "passed", score: 1, feedback: "Да" },
      { attemptNumber: 1, outcome: "passed", score: 0.5, feedback: "Да" },
      { attemptNumber: 1, outcome: "passed", score: 1, feedback: "" },
      {
        attemptNumber: 1,
        outcome: "passed",
        score: 1,
        feedback: "Да",
        extra: true
      }
    ]
  ],
  [
    "assignment result",
    assignmentCheckResultSchema,
    clientAssignmentCheckResultSchema,
    [
      {
        attemptNumber: 2,
        outcome: "failed",
        score: 0.33333,
        checks: [{ label: "h1", passed: false, hint: "Добавьте" }]
      },
      { attemptNumber: 1, outcome: "passed", score: 1, checks: [] },
      { attemptNumber: 1, outcome: "passed", score: 1.5, checks: [] },
      {
        attemptNumber: 1,
        outcome: "passed",
        score: 1,
        checks: [{ label: "", passed: true }]
      },
      {
        attemptNumber: 1,
        outcome: "passed",
        score: 1,
        checks: [{ label: "x", passed: true, other: 1 }]
      }
    ]
  ],
  [
    "course skills",
    learnerCourseSkillsSchema,
    clientLearnerCourseSkillsSchema,
    [
      { skills: [] },
      {
        skills: [
          skill({
            state: "unobserved",
            masteryScore: null,
            evidenceCount: 0,
            scoredEvidenceCount: 0,
            lastEvidenceAt: null
          })
        ]
      },
      {
        skills: [
          skill({
            state: "observed_unscored",
            masteryScore: null,
            evidenceCount: 2,
            scoredEvidenceCount: 0,
            lastEvidenceAt: at
          })
        ]
      },
      {
        skills: [
          skill({
            state: "assessed",
            masteryScore: 0.7,
            evidenceCount: 2,
            scoredEvidenceCount: 2,
            lastEvidenceAt: at
          })
        ]
      },
      {
        skills: [
          skill({
            state: "assessed",
            masteryScore: 0.7,
            evidenceCount: 1,
            scoredEvidenceCount: 2,
            lastEvidenceAt: at
          })
        ]
      },
      {
        skills: [
          skill({
            state: "assessed",
            masteryScore: 1.2,
            evidenceCount: 1,
            scoredEvidenceCount: 1,
            lastEvidenceAt: at
          })
        ]
      },
      {
        skills: [
          skill({
            title: "   ",
            state: "unobserved",
            masteryScore: null,
            evidenceCount: 0,
            scoredEvidenceCount: 0,
            lastEvidenceAt: null
          })
        ]
      },
      { skills: [], extra: 1 }
    ]
  ],
  [
    "learner course",
    learnerLearningCourseSchema,
    clientLearnerLearningCourseSchema,
    [
      course,
      { ...course, progress: null },
      { ...course, entry: { ...course.entry, enrollmentStatus: null } },
      { ...course, course: { ...course.course, lessons: [] } },
      { ...course, offering: { slug: "Bad Slug", name: "x" } },
      { ...course, progress: { ...course.progress, percentage: 101 } },
      { ...course, extra: 1 }
    ]
  ],
  [
    "own learning list",
    ownLearningListSchema,
    clientOwnLearningListSchema,
    [
      { courses: [course], nextCursor: null },
      { courses: [], nextCursor: id },
      { courses: [], nextCursor: "x" },
      { courses: [{ ...course, entry: {} }], nextCursor: null }
    ]
  ]
];

describe("client schemas agree with the full contracts (WP-6)", () => {
  it.each(pairs)("%s", (_, full, client, samples) => {
    for (const sample of samples)
      expect(client.safeParse(sample).success, JSON.stringify(sample)).toBe(
        full.safeParse(sample).success
      );
  });

  it("covers valid and invalid samples for every schema", () => {
    for (const [, full, , samples] of pairs) {
      const results = samples.map((sample) => full.safeParse(sample).success);
      expect(results).toContain(true);
      expect(results).toContain(false);
    }
  });
});
