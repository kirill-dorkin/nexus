import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { courseManifestV1Schema } from "./course-manifest";

function launchManifest() {
  const raw = JSON.parse(
    readFileSync(
      new URL("../../../docs/examples/computer-basics-first-course.manifest.json", import.meta.url),
      "utf8"
    )
  );
  return courseManifestV1Schema.parse(raw);
}

describe("first public computer basics course import", () => {
  it("uses the exact strict Studio manifest schema, without tenant identities", () => {
    const manifest = launchManifest();
    expect(manifest.schemaVersion).toBe(1);
    expect(manifest.course.slug).toBe("kak-ustroen-kompyuter");
    expect(Object.keys(manifest)).toEqual([
      "schemaVersion", "course", "skills", "activities", "lessons"
    ]);
    expect(manifest.lessons).toHaveLength(4);
    expect(manifest.activities).toHaveLength(8);
    expect(manifest.skills).toHaveLength(4);
  });

  it("provides short, coherent lessons with real markdown and graded required practice", () => {
    const manifest = launchManifest();
    const ids = new Set(manifest.activities.map((activity) => activity.slug));
    expect(new Set(manifest.lessons.map((lesson) => lesson.slug)).size).toBe(4);
    expect(manifest.lessons.map((lesson) => lesson.durationMinutes)).toEqual([12, 12, 13, 14]);
    for (const lesson of manifest.lessons) {
      expect(lesson.blocks.some(
        (block) => block.type === "markdown" && block.markdown.length > 700
      )).toBe(true);
      expect(lesson.blocks.some((block) =>
        block.type === "activity" && block.required && ids.has(block.activitySlug)
      )).toBe(true);
      expect(lesson.blocks.some((block) => block.type === "youtube")).toBe(false);
    }
  });

  it("never uses fake video IDs or privileged authority and keeps quiz keys coherent", () => {
    const manifest = launchManifest();
    const skillKeys = new Set(manifest.skills.map((s) => s.key));
    for (const activity of manifest.activities) {
      expect(activity.skillKeys.every((key) => skillKeys.has(key))).toBe(true);
      if (activity.type === "quiz.short_text") {
        throw new Error("The first course uses only deterministic choice quizzes.");
      }
      const choices = new Set(activity.presentation.options.map((option) => option.id));
      if (activity.type === "quiz.single_choice")
        expect(choices.has(activity.validation.correctOptionId)).toBe(true);
      if (activity.type === "quiz.multiple_choice")
        expect(activity.validation.correctOptionIds.every((id) => choices.has(id))).toBe(true);
    }
    const raw = JSON.stringify(manifest);
    expect(raw).not.toMatch(/"organizationId"|"userId"|"enrollmentId"|"iframe"/);
  });
});
