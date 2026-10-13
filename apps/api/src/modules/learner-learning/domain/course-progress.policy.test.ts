import { describe, it, expect } from "vitest";
import { deriveCourseProgress } from "./course-progress.policy";
const structure = [
  { slug: "intro", activities: [] },
  {
    slug: "practice",
    activities: [
      { slug: "one", activityVersionId: "v1", required: true },
      { slug: "optional", activityVersionId: "v2", required: false },
      { slug: "one", activityVersionId: "v1", required: true }
    ]
  },
  {
    slug: "next",
    activities: [
      { slug: "one", activityVersionId: "v1", required: true },
      { slug: "three", activityVersionId: "v3", required: true }
    ]
  }
];
describe("required-activity-passes@1", () => {
  it("deduplicates shared required references and skips informational Lessons", () => {
    const p = deriveCourseProgress(structure, []);
    expect(p.totalRequired).toBe(2);
    expect(p.percentage).toBe(0);
    expect(p.nextLessonSlug).toBe("practice");
    expect(p.lessons[0]!.requiredPassed).toBe(false);
    expect(p.lessons[1]!.totalRequired).toBe(1);
  });
  it("counts canonical passes without manufacturing enrollment completion", () => {
    const p = deriveCourseProgress(structure, [
      {
        activityVersionId: "v1",
        passed: true,
        lastActionAt: "2026-10-06T00:00:00.000Z"
      },
      {
        activityVersionId: "v2",
        passed: true,
        lastActionAt: "2026-10-06T01:00:00.000Z"
      }
    ]);
    expect(p.passedRequired).toBe(1);
    expect(p.percentage).toBe(50);
    expect(p.nextLessonSlug).toBe("next");
    expect(p.lessons[1]!.requiredPassed).toBe(true);
    expect(p.lastActionAt).toBe("2026-10-06T01:00:00.000Z");
    expect(p).not.toHaveProperty("enrollmentStatus");
  });
  it("keeps a zero-required course honest", () => {
    const p = deriveCourseProgress(structure.slice(0, 1), []);
    expect(p.percentage).toBeNull();
    expect(p.allRequiredPassed).toBe(false);
    expect(p.nextLessonSlug).toBe("intro");
  });
  it("exposes all required passed independently of informational completion", () => {
    const p = deriveCourseProgress(
      structure,
      ["v1", "v3"].map((activityVersionId) => ({
        activityVersionId,
        passed: true,
        lastActionAt: "2026-10-06T00:00:00.000Z"
      }))
    );
    expect(p.percentage).toBe(100);
    expect(p.allRequiredPassed).toBe(true);
    expect(p.nextLessonSlug).toBeNull();
    expect(p.lessons[0]!.requiredPassed).toBe(false);
  });
});
