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

  it("gives every lesson runnable HTML: an example or a hands-on challenge", () => {
    for (const lesson of htmlTrack().lessons) {
      const text = lesson.blocks.flatMap((b) => (b.type === "markdown" ? [b.markdown] : [])).join("\n");
      expect(/```(html|challenge)\n/.test(text), lesson.slug).toBe(true);
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

  it("teaches every element and attribute of the HTML Living Standard index", () => {
    // Refresh with: node docs/examples/html-course/update-spec-index.mjs
    const index = JSON.parse(
      readFileSync(new URL("../../../docs/examples/html-course/spec-index.json", import.meta.url), "utf8")
    ) as { elements: string[]; attributes: string[] };
    const text = JSON.stringify(htmlTrack()).toLowerCase();
    const missingElements = index.elements.filter(
      (name) => !new RegExp(`<${name}[\\s>/]|\x60${name}\x60`).test(text)
    );
    const missingAttributes = index.attributes.filter(
      (name) => !new RegExp(`[\\s"\x60(]${name}(=|\x60|[\\s"),>/])`).test(text)
    );
    expect(missingElements, "elements not taught").toEqual([]);
    expect(missingAttributes, "attributes not taught").toEqual([]);
  });

  it("explains every element and attribute with its own concept card", () => {
    // A concept card is a ```concept fence; its `name` may list several items (`<b> · <i>`),
    // but every element and attribute must also have a card that is about it alone.
    const index = JSON.parse(
      readFileSync(new URL("../../../docs/examples/html-course/spec-index.json", import.meta.url), "utf8")
    ) as { elements: string[]; attributes: string[] };
    const own = new Set<string>();
    for (const lesson of htmlTrack().lessons)
      for (const block of lesson.blocks) {
        if (block.type !== "markdown") continue;
        for (const [, body] of block.markdown.matchAll(/```concept\n([\s\S]*?)\n```/g)) {
          const name = (JSON.parse(body!) as { name: string }).name;
          const parts = name.split(/\s*(?:·|\+|,)\s*|\s+(?=<)/).filter(Boolean);
          if (parts.length === 1) own.add(parts[0]!.replace(/^<|>$/g, "").split(/[\s=]/)[0]!.toLowerCase());
        }
      }
    expect(index.elements.filter((name) => !own.has(name)), "elements without their own card").toEqual([]);
    expect(index.attributes.filter((name) => !own.has(name)), "attributes without their own card").toEqual([]);
  });

  it("has no storyline: no removed characters and no café business", () => {
    // Lessons use topic examples; only tool characters remain (ADR-0066). \b is ASCII-only, so
    // Cyrillic whole words use \p{L} lookarounds.
    const text = JSON.stringify(htmlTrack());
    const banned = /"(marta|sonya|dasha)"|zerno|(?<!\p{L})Зерн|кофе|латте|капучино|эспрессо|бариста|какао|чизкейк|напит|столик|кухн|сироп|молок|(?<!\p{L})(раф|гост[ьяеиюй]\p{L}*|Март[аыу]|Сон[яиеу]|Тимур\p{L}*)(?!\p{L})/giu;
    expect([...new Set(text.match(banned) ?? [])]).toEqual([]);
  });

  it("explains everything itself and never sends the learner elsewhere for answers", () => {
    const text = JSON.stringify(htmlTrack());
    const elsewhere = /(?<![\w.])MDN(?![\w.])|developer\.mozilla|w3schools|stackoverflow|stack overflow|validator\.w3|google|гугл|загугл|поищи|почитай (в|на)|читай документаци|подробнее (в|на) /giu;
    expect([...new Set(text.match(elsewhere) ?? [])]).toEqual([]);
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
