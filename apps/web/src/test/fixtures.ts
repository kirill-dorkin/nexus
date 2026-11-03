// Shared builders for component tests: contract-valid API data and responses.
import type {
  LearnerCourseProgress,
  LearnerLearningCourse
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
