// Shared builders for component tests: contract-valid API data and responses.
import type {
  CourseManifestV1,
  LearnerCourseProgress,
  LearnerCourseSkills,
  LearnerLearningCourse,
  StudioDraft
} from "@platform/contracts";

export function json(status: number, body?: unknown): Response {
  return new Response(body === undefined ? null : JSON.stringify(body), {
    status
  });
}

export function progress(
  overrides: Partial<LearnerCourseProgress> = {}
): LearnerCourseProgress {
  return {
    policyKey: "required-activity-passes",
    policyVersion: 2,
    passedRequired: 1,
    totalRequired: 4,
    percentage: 25,
    allRequiredPassed: false,
    nextLessonSlug: "tags",
    lastActionAt: "2026-11-03T10:00:00.000Z",
    lessons: [
      {
        slug: "intro",
        passedRequired: 1,
        totalRequired: 1,
        requiredPassed: true,
        activities: []
      },
      {
        slug: "tags",
        passedRequired: 0,
        totalRequired: 3,
        requiredPassed: false,
        activities: []
      }
    ],
    ...overrides
  };
}

export function learnerCourse(
  overrides: Partial<LearnerLearningCourse> = {}
): LearnerLearningCourse {
  return {
    organization: { slug: "acme", name: "Acme" },
    offering: { slug: "web", name: "Веб с нуля" },
    course: {
      slug: "html",
      title: "HTML с нуля",
      description: "Разметка страниц.",
      lessons: [
        {
          slug: "intro",
          title: "Что такое HTML",
          summary: "",
          durationMinutes: 10
        },
        { slug: "tags", title: "Теги", summary: "", durationMinutes: 15 }
      ]
    },
    entry: {
      customerEntryPolicy: "open",
      membershipStatus: "none",
      enrollmentStatus: null
    },
    progress: null,
    ...overrides
  };
}

/** A small course manifest that passes `courseManifestV1Schema`. */
export function manifest(): CourseManifestV1 {
  return {
    schemaVersion: 1,
    course: {
      slug: "html",
      title: "HTML с нуля",
      description: "Разметка страниц."
    },
    skills: [{ key: "tags", title: "Теги", description: "Пишет теги." }],
    activities: [
      {
        slug: "first-tag",
        title: "Первый тег",
        instructions: "",
        skillKeys: ["tags"],
        type: "quiz.single_choice",
        presentation: {
          question: "Какой тег делает заголовок?",
          options: [
            { id: "h1", text: "<h1>" },
            { id: "p", text: "<p>" }
          ]
        },
        validation: { correctOptionId: "h1", explanation: "Заголовок — h1." }
      }
    ],
    lessons: [
      {
        slug: "intro",
        title: "Введение",
        summary: "Что такое HTML.",
        durationMinutes: 10,
        blocks: [
          { type: "markdown", markdown: "## Привет" },
          {
            type: "activity",
            activitySlug: "first-tag",
            kind: "practice",
            required: true
          }
        ]
      }
    ]
  };
}

export function studioDraft(overrides: Partial<StudioDraft> = {}): StudioDraft {
  return {
    courseId: "0195d9a8-6c8e-7000-8000-0000000000e1",
    slug: "html",
    title: "HTML с нуля",
    versionId: "0195d9a8-6c8e-7000-8000-0000000000e2",
    versionNumber: 2,
    status: "draft",
    revision: 3,
    manifest: manifest(),
    canApply: true,
    canPublish: true,
    ...overrides
  };
}

const skillIds = [
  "0195d9a8-6c8e-7000-8000-0000000000a1",
  "0195d9a8-6c8e-7000-8000-0000000000a2",
  "0195d9a8-6c8e-7000-8000-0000000000a3"
] as const;

/** One skill in each learner-facing state, valid for `learnerCourseSkillsSchema`. */
export function courseSkills(): LearnerCourseSkills {
  return {
    skills: [
      {
        skillId: skillIds[0],
        title: "Структура документа",
        description: null,
        position: 0,
        state: "assessed",
        masteryScore: 0.85,
        evidenceCount: 2,
        scoredEvidenceCount: 2,
        lastEvidenceAt: "2026-11-03T10:00:00.000Z"
      },
      {
        skillId: skillIds[1],
        title: "Ссылки",
        description: null,
        position: 1,
        state: "observed_unscored",
        masteryScore: null,
        evidenceCount: 1,
        scoredEvidenceCount: 0,
        lastEvidenceAt: "2026-11-03T10:00:00.000Z"
      },
      {
        skillId: skillIds[2],
        title: "Таблицы",
        description: null,
        position: 2,
        state: "unobserved",
        masteryScore: null,
        evidenceCount: 0,
        scoredEvidenceCount: 0,
        lastEvidenceAt: null
      }
    ]
  };
}
