import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { courseManifestV1Schema } from "./course-manifest";

function htmlTrack() {
  const raw = JSON.parse(
    readFileSync(new URL("../../../docs/examples/html-track.manifest.json", import.meta.url), "utf8")
  );
  return courseManifestV1Schema.parse(raw);
}

describe("HTML full course import", () => {
  it("passes the strict Studio manifest schema without tenant identities", () => {
    const manifest = htmlTrack();
    expect(manifest.course.slug).toBe("html");
    expect(JSON.stringify(manifest)).not.toMatch(/"organizationId"|"userId"|"enrollmentId"/);
  });

  it("keeps one atomic skill per lesson with required graded practice", () => {
    const manifest = htmlTrack();
    const activities = new Map(manifest.activities.map((a) => [a.slug, a]));
    expect(manifest.lessons.length).toBeGreaterThanOrEqual(45);
    for (const lesson of manifest.lessons) {
      const used = lesson.blocks.flatMap((b) => (b.type === "activity" ? [b] : []));
      expect(used.some((b) => b.required), lesson.slug).toBe(true);
      const lessonSkills = new Set(used.flatMap((b) => activities.get(b.activitySlug)!.skillKeys));
      expect(lessonSkills.size, lesson.slug).toBe(1);
      expect(lesson.durationMinutes).toBeLessThanOrEqual(45);
    }
  });

  it("gives every lesson runnable HTML examples for the local sandbox", () => {
    for (const lesson of htmlTrack().lessons) {
      const text = lesson.blocks.flatMap((b) => (b.type === "markdown" ? [b.markdown] : [])).join("\n");
      expect(text, lesson.slug).toContain("```html\n");
    }
  });

  it("avoids Markdown the lesson renderer does not support (no GFM tables or task lists)", () => {
    for (const lesson of htmlTrack().lessons) {
      for (const block of lesson.blocks) {
        if (block.type !== "markdown") continue;
        const prose = block.markdown.replace(/```[\s\S]*?```/g, "");
        expect(prose, lesson.slug).not.toMatch(/^\s*\|.*\|\s*$/m);
        expect(prose, lesson.slug).not.toMatch(/^\s*- \[[ x]\]/m);
      }
    }
  });

  it("shows tags in questions as inline code, because question Markdown strips raw HTML", () => {
    for (const activity of htmlTrack().activities) {
      const outsideCode = activity.presentation.question.replace(/`[^`]*`/g, "");
      expect(outsideCode, activity.slug).not.toMatch(/<[a-z/][^>]*>|&[a-z]+;/i);
    }
  });

  it("keeps quiz answer keys coherent", () => {
    for (const activity of htmlTrack().activities) {
      if (activity.type === "quiz.short_text") {
        expect(activity.validation.acceptedAnswers.length).toBeGreaterThan(0);
        continue;
      }
      const ids = new Set(activity.presentation.options.map((o) => o.id));
      if (activity.type === "quiz.single_choice") expect(ids.has(activity.validation.correctOptionId)).toBe(true);
      else expect(activity.validation.correctOptionIds.every((id) => ids.has(id))).toBe(true);
    }
  });
});
