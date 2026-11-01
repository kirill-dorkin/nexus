import { describe, it, expect } from "vitest";
import { deriveCourseProgress } from "./course-progress.policy";
const structure = [
  { slug: "intro", activities: [] },
  {
    slug: "practice",
    activities: [
      { slug: "one", activityId: "v1", activityVersionId: "v1", required: true },
      { slug: "optional", activityId: "v2", activityVersionId: "v2", required: false },
      { slug: "one", activityId: "v1", activityVersionId: "v1", required: true }
    ]
  },
  {
    slug: "next",
    activities: [
      { slug: "one", activityId: "v1", activityVersionId: "v1", required: true },
      { slug: "three", activityId: "v3", activityVersionId: "v3", required: true }
    ]
  }
];
describe("required-activity-passes@2", () => {
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
  it("keeps work done on an earlier published version of the same Activity (ADR-0062)", () => {
    const republished = [
      { slug: "practice", activities: [{ slug: "one", activityId: "a1", activityVersionId: "v9", required: true }] }
    ];
    const lineage = new Map([["v1", "a1"], ["v9", "a1"]]);
    const p = deriveCourseProgress(
      republished,
      [{ activityVersionId: "v1", passed: true, lastActionAt: "2026-11-01T10:00:00.000Z" }],
      lineage
    );
    expect(p.policyVersion).toBe(2);
    expect(p.passedRequired).toBe(1);
    expect(p.allRequiredPassed).toBe(true);
    expect(p.lessons[0]!.activities).toEqual([{ slug: "one", passed: true }]);
    const unrelated = deriveCourseProgress(
      republished,
      [{ activityVersionId: "v7", passed: true, lastActionAt: "2026-11-01T10:00:00.000Z" }],
      lineage
    );
    expect(unrelated.passedRequired).toBe(0);
  });
});
