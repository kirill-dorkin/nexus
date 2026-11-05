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
  clientOwnSkillsSchema,
  clientOwnSkillTestsSchema,
  clientQuizCheckResultSchema,
  clientSkillTestCooldownSchema,
  clientSkillTestDrawSchema,
  clientSkillTestResultSchema
} from "./client";
import {
  learnerCourseSkillsSchema,
  learnerLearningCourseSchema,
  ownLearningListSchema
} from "./learner-learning";
import { ownSkillsSchema } from "./own-skills";
import { quizCheckResultSchema } from "./quiz-check";
import {
  ownSkillTestsSchema,
  skillTestCooldownSchema,
  skillTestDrawSchema,
  skillTestResultSchema
} from "./skill-test";

const choiceQuestion = {
  skillKey: "tags",
  key: "q-1",
  kind: "code_output",
  prompt: "Что выведет код?",
  code: { language: "html", source: "<p>Привет</p>" },
  options: [
    { id: "a", text: "Привет" },
    { id: "b", text: "Ничего" }
  ]
};
const draw = {
  drawKey: "0194f6c2-1b2c-7d3e-8f40-123456789abc",
  scope: { type: "skill", skillKey: "tags" },
  threshold: 4,
  questions: [
    choiceQuestion,
    { skillKey: "tags", key: "q-2", kind: "short_text", prompt: "Тег абзаца?" }
  ]
};
const graded = {
  drawKey: draw.drawKey,
  scope: { type: "branch", branchId: "html-1" },
  outcome: "failed",
  correctCount: 3,
  total: 5,
  threshold: 4,
  retryAfter: "2026-11-04T10:10:00.000Z",
  questions: [
    {
      skillKey: "tags",
      key: "q-1",
      correct: false,
      explanation: "Браузер покажет текст абзаца.",
      chosen: [{ id: "b", explanation: "Текст внутри p виден." }]
    }
  ]
};

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

const own = (extra: object) => ({
  skillKey: "html-headings",
  masteryScore: 0.5,
  evidenceCount: 2,
  scoredEvidenceCount: 2,
  lastEvidenceAt: at,
  confirmations: 1,
  firstConfirmedAt: at,
  lastConfirmedAt: at,
  confirmedDays: ["2026-11-04"],
  freshness: {
    policy: "skill-freshness@1",
    state: "confirmed",
    step: 1,
    dueOn: "2026-11-07",
    forgottenAfter: "2026-11-14"
  },
  ...extra
});
const unconfirmed = {
  policy: "skill-freshness@1",
  state: "unconfirmed",
  step: 0,
  dueOn: null,
  forgottenAfter: null
};

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
    "own skills",
    ownSkillsSchema,
    clientOwnSkillsSchema,
    [
      { skills: [] },
      { skills: [own({})] },
      {
        skills: [
          own({
            masteryScore: null,
            scoredEvidenceCount: 0,
            confirmations: 0,
            firstConfirmedAt: null,
            lastConfirmedAt: null,
            confirmedDays: [],
            freshness: unconfirmed
          })
        ]
      },
      { skills: [own({ freshness: unconfirmed })] },
      {
        skills: [own({ freshness: { ...unconfirmed, state: "confirmed" } })]
      },
      {
        skills: [
          own({
            freshness: {
              policy: "skill-freshness@1",
              state: "forgotten",
              step: 2,
              dueOn: "2026-10-01",
              forgottenAfter: "2026-10-08"
            }
          })
        ]
      },
      {
        skills: [
          own({ freshness: { ...unconfirmed, policy: "skill-freshness@2" } })
        ]
      },
      { skills: [own({ freshness: undefined })] },
      { skills: [own({ skillKey: "Bad Key" })] },
      { skills: [own({ masteryScore: null })] },
      { skills: [own({ masteryScore: 1.5 })] },
      { skills: [own({ scoredEvidenceCount: 3 })] },
      { skills: [own({ confirmations: 3 })] },
      { skills: [own({ firstConfirmedAt: null })] },
      { skills: [own({ confirmations: 0 })] },
      { skills: [own({ evidenceCount: 0 })] },
      {
        skills: [
          own({
            evidenceCount: 3,
            confirmations: 2,
            confirmedDays: ["2026-11-01", "2026-11-04"]
          })
        ]
      },
      { skills: [own({ confirmedDays: [] })] },
      { skills: [own({ confirmedDays: ["2026-11-04", "2026-11-04"] })] },
      {
        skills: [
          own({
            evidenceCount: 3,
            confirmations: 2,
            confirmedDays: ["2026-11-04", "2026-11-01"]
          })
        ]
      },
      { skills: [own({ confirmedDays: ["2026-11-04T00:00:00Z"] })] },
      { skills: [own({ extra: 1 })] },
      { skills: [], extra: 1 }
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
  ],
  [
    "skill test draw",
    skillTestDrawSchema,
    clientSkillTestDrawSchema,
    [
      draw,
      { ...draw, questions: [] },
      { ...draw, scope: { type: "lesson", skillKey: "tags" } },
      { ...draw, questions: [{ ...choiceQuestion, correct: ["a"] }] },
      {
        ...draw,
        questions: [
          {
            ...choiceQuestion,
            options: [
              { id: "a", text: "Привет", explanation: "x" },
              choiceQuestion.options[1]
            ]
          }
        ]
      },
      { ...draw, questions: [{ ...choiceQuestion, kind: "essay" }] },
      { ...draw, threshold: 0 }
    ]
  ],
  [
    "skill test result",
    skillTestResultSchema,
    clientSkillTestResultSchema,
    [
      graded,
      { ...graded, outcome: "passed", correctCount: 5, retryAfter: null },
      { ...graded, retryAfter: "soon" },
      { ...graded, total: 0 },
      { ...graded, questions: [] },
      { ...graded, questions: [{ ...graded.questions[0], explanation: "" }] },
      { ...graded, extra: true }
    ]
  ],
  [
    "skill test cooldown",
    skillTestCooldownSchema,
    clientSkillTestCooldownSchema,
    [
      {
        code: "retake_cooldown",
        message: "Позже",
        retryAfter: "2026-11-04T10:10:00.000Z"
      },
      { code: "retake_cooldown", message: "Позже", retryAfter: "soon" },
      { code: "other", message: "x", retryAfter: "2026-11-04T10:10:00.000Z" }
    ]
  ],
  [
    "own skill tests",
    ownSkillTestsSchema,
    clientOwnSkillTestsSchema,
    [
      { skillKeys: [] },
      { skillKeys: ["tags", "web-tools"] },
      { skillKeys: ["Tags"] },
      { skillKeys: [], extra: 1 }
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
