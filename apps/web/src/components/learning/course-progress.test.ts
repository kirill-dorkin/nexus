import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { LearnerLearningCourse } from "@platform/contracts";
import { CourseProgress } from "./course-progress";

const learning: LearnerLearningCourse = {
  organization: { slug: "academy", name: "Academy" },
  offering: { slug: "basics", name: "Basics" },
  course: {
    title: "Basics",
    description: "",
    lessons: [
      { slug: "intro", title: "Intro", summary: "", durationMinutes: 5 }
    ]
  },
  entry: {
    customerEntryPolicy: "open",
    membershipStatus: "active",
    enrollmentStatus: "active"
  },
  progress: {
    policyKey: "required-activity-passes",
    policyVersion: 1,
    passedRequired: 0,
    totalRequired: 2,
    percentage: 0,
    allRequiredPassed: false,
    nextLessonSlug: "intro",
    lastActionAt: null,
    lessons: []
  }
};
const render = (value: LearnerLearningCourse) =>
  renderToStaticMarkup(createElement(CourseProgress, { learning: value }));

describe("learner progress presentation", () => {
  it("preserves canonical zero and the required-task count in the accessible label", () => {
    const markup = render(learning);
    expect(markup).toContain('value="0"');
    expect(markup).toContain('aria-label="Задания курса: 0 из 2"');
  });
  it("does not fabricate progress for an unenrolled or informational course", () => {
    expect(render({ ...learning, progress: null })).toBe("");
    const markup = render({
      ...learning,
      progress: { ...learning.progress!, totalRequired: 0, percentage: null }
    });
    expect(markup).toContain("нет обязательных заданий");
    expect(markup).not.toContain("<progress");
    expect(markup).not.toContain("Обучение завершено");
  });
  it("distinguishes all task passes from the canonical Enrollment lifecycle", () => {
    const passed = {
      ...learning,
      progress: {
        ...learning.progress!,
        passedRequired: 2,
        percentage: 100,
        allRequiredPassed: true
      }
    };
    expect(render(passed)).toContain(
      "Все обязательные задания курса выполнены"
    );
    expect(render(passed)).not.toContain("Обучение завершено");
    expect(
      render({
        ...passed,
        entry: { ...passed.entry, enrollmentStatus: "completed" }
      })
    ).toContain("Обучение завершено");
  });
});
