import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { courseManifestV1Schema } from "./course-manifest";

function cssTrack() {
  const raw = JSON.parse(
    readFileSync(new URL("../../../docs/examples/css-track.manifest.json", import.meta.url), "utf8")
  );
  return courseManifestV1Schema.parse(raw);
}

function conceptNames(): string[][] {
  const names: string[][] = [];
  for (const lesson of cssTrack().lessons)
    for (const block of lesson.blocks) {
      if (block.type !== "markdown") continue;
      for (const [, body] of block.markdown.matchAll(/```concept\n([\s\S]*?)\n```/g))
        names.push((JSON.parse(body!) as { name: string }).name.split(/\s*·\s*/));
    }
  return names;
}

describe("CSS full course import", () => {
  it("passes the strict Studio manifest schema without tenant identities", () => {
    const manifest = cssTrack();
    expect(manifest.course.slug).toBe("css");
    expect(JSON.stringify(manifest)).not.toMatch(/"organizationId"|"userId"|"enrollmentId"/);
  });

  it("keeps one atomic skill per lesson with required graded practice and a chapter", () => {
    const manifest = cssTrack();
    const activities = new Map(manifest.activities.map((a) => [a.slug, a]));
    expect(manifest.lessons.length).toBeGreaterThanOrEqual(45);
    for (const lesson of manifest.lessons) {
      const used = lesson.blocks.flatMap((b) => (b.type === "activity" ? [b] : []));
      expect(used.some((b) => b.required), lesson.slug).toBe(true);
      const lessonSkills = new Set(used.flatMap((b) => activities.get(b.activitySlug)!.skillKeys));
      expect(lessonSkills.size, lesson.slug).toBe(1);
      expect(lesson.durationMinutes).toBeLessThanOrEqual(45);
      expect(lesson.chapter, lesson.slug).toBeTruthy();
    }
  });

  it("gives every lesson a hands-on challenge", () => {
    for (const lesson of cssTrack().lessons) {
      const text = lesson.blocks.flatMap((b) => (b.type === "markdown" ? [b.markdown] : [])).join("\n");
      expect(text, lesson.slug).toMatch(/```challenge\n/);
    }
  });

  it("avoids Markdown the lesson renderer does not support (no GFM tables or task lists)", () => {
    for (const lesson of cssTrack().lessons) {
      for (const block of lesson.blocks) {
        if (block.type !== "markdown") continue;
        const prose = block.markdown.replace(/```[\s\S]*?```/g, "");
        expect(prose, lesson.slug).not.toMatch(/^\s*\|.*\|\s*$/m);
        expect(prose, lesson.slug).not.toMatch(/^\s*- \[[ x]\]/m);
      }
    }
  });

  it("shows markup in questions as inline code, because question Markdown strips raw HTML", () => {
    for (const activity of cssTrack().activities) {
      const outsideCode = activity.presentation.question.replace(/`[^`]*`/g, "");
      expect(outsideCode, activity.slug).not.toMatch(/<[a-z/][^>]*>|&[a-z]+;/i);
    }
  });

  it("explains every indexed property, selector, at-rule, function and value with a concept card", () => {
    const index = JSON.parse(
      readFileSync(new URL("../../../docs/examples/css-course/css-index.json", import.meta.url), "utf8")
    ) as Record<"properties" | "selectors" | "atRules" | "functions" | "values", string[]>;
    const taught = new Set(conceptNames().flat());
    for (const group of ["properties", "selectors", "atRules", "functions", "values"] as const)
      expect(index[group].filter((item) => !taught.has(item)), `${group} without a card`).toEqual([]);
  });

  it("explains each item once, without repeating a card in another lesson", () => {
    const seen = new Map<string, number>();
    for (const parts of conceptNames()) for (const part of parts) seen.set(part, (seen.get(part) ?? 0) + 1);
    expect([...seen].filter(([, count]) => count > 1).map(([name]) => name)).toEqual([]);
  });

  it("keeps quiz answer keys coherent", () => {
    for (const activity of cssTrack().activities) {
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
