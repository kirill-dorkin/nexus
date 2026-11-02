import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { courseManifestV1Schema } from "./course-manifest";

function jsTrack() {
  const raw = JSON.parse(
    readFileSync(new URL("../../../docs/examples/js-track.manifest.json", import.meta.url), "utf8")
  );
  return courseManifestV1Schema.parse(raw);
}

describe("JavaScript full course import", () => {
  it("passes the strict Studio manifest schema without tenant identities", () => {
    const manifest = jsTrack();
    expect(manifest.course.slug).toBe("js");
    expect(JSON.stringify(manifest)).not.toMatch(/"organizationId"|"userId"|"enrollmentId"/);
  });

  it("keeps one atomic skill per lesson with required graded practice and a chapter", () => {
    const manifest = jsTrack();
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
    for (const lesson of jsTrack().lessons) {
      const text = lesson.blocks.flatMap((b) => (b.type === "markdown" ? [b.markdown] : [])).join("\n");
      expect(text, lesson.slug).toMatch(/```challenge\n/);
    }
  });

  it("avoids Markdown the lesson renderer does not support (no GFM tables or task lists)", () => {
    for (const lesson of jsTrack().lessons) {
      for (const block of lesson.blocks) {
        if (block.type !== "markdown") continue;
        const prose = block.markdown.replace(/```[\s\S]*?```/g, "");
        expect(prose, lesson.slug).not.toMatch(/^\s*\|.*\|\s*$/m);
        expect(prose, lesson.slug).not.toMatch(/^\s*- \[[ x]\]/m);
      }
    }
  });

  it("shows markup in questions as inline code, because question Markdown strips raw HTML", () => {
    for (const activity of jsTrack().activities) {
      const outsideCode = activity.presentation.question.replace(/`[^`]*`/g, "");
      expect(outsideCode, activity.slug).not.toMatch(/<[a-z/][^>]*>|&[a-z]+;/i);
    }
  });

  it("covers the whole language: every ECMAScript 2025 syntax item and built-in member, exactly once", () => {
    // Refresh with: node docs/examples/js-course/update-spec-index.mjs
    const index = JSON.parse(
      readFileSync(new URL("../../../docs/examples/js-course/spec-index.json", import.meta.url), "utf8")
    ) as { syntax: string[]; builtins: string[]; legacy: string[] };
    const count = new Map<string, number>();
    const legacy = new Set(index.legacy);
    for (const lesson of jsTrack().lessons)
      for (const block of lesson.blocks) {
        if (block.type !== "markdown") continue;
        for (const [, body] of block.markdown.matchAll(/```concept\n([\s\S]*?)\n```/g)) {
          const card = JSON.parse(body!) as { name: string; covers?: string[] };
          const covers = card.covers ?? [];
          // A card explains a few closely related items, never a dump of names.
          expect(covers.length, card.name).toBeLessThanOrEqual(covers.every((c) => legacy.has(c)) ? 8 : 4);
          for (const item of covers) count.set(item, (count.get(item) ?? 0) + 1);
        }
      }
    const all = [...index.syntax, ...index.builtins, ...index.legacy];
    expect(all.filter((item) => !count.has(item)), "not taught").toEqual([]);
    // Uniqueness is by spec item, not by card name: `keys() · values()` exists on Map, Set and arrays alike.
    expect([...count].filter(([, n]) => n > 1).map(([item]) => item), "taught twice").toEqual([]);
    expect([...count.keys()].filter((item) => !all.includes(item)), "covers outside the index").toEqual([]);
  });

  it("keeps quiz answer keys coherent", () => {
    for (const activity of jsTrack().activities) {
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
