import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { courseManifestV1Schema, isQuizActivity } from "./course-manifest";

// The Python character's course: built from docs/examples/python-course.
const read = (path: string): unknown =>
  JSON.parse(
    readFileSync(
      new URL(`../../../docs/examples/${path}`, import.meta.url),
      "utf8"
    )
  );
const track = () =>
  courseManifestV1Schema.parse(read("python-track.manifest.json"));

/** The subject areas the course must cover; the index lists every item of each. */
const TOPICS = [
  "start",
  "types",
  "flow",
  "collections",
  "functions",
  "files",
  "errors",
  "modules",
  "classes",
  "idioms",
  "practice"
];
type Index = { topics: Record<string, { title: string; items: string[] }> };

const markdown = () =>
  track().lessons.map((lesson) => ({
    lesson,
    text: lesson.blocks
      .flatMap((b) => (b.type === "markdown" ? [b.markdown] : []))
      .join("\n")
  }));
const fenced = (text: string, lang: string) =>
  [
    ...text.matchAll(new RegExp("```" + lang + "\\n([\\s\\S]*?)\\n```", "g"))
  ].map((m) => JSON.parse(m[1]!) as Record<string, unknown>);
const cardNames = () =>
  markdown().flatMap(({ text }) =>
    fenced(text, "concept").map((card) => card.name as string)
  );

describe("Python course import", () => {
  it("passes the strict Studio manifest schema without tenant identities", () => {
    const manifest = track();
    expect(manifest.course.slug).toBe("python");
    expect(JSON.stringify(manifest)).not.toMatch(
      /"organizationId"|"userId"|"enrollmentId"/
    );
  });

  it("keeps one skill per lesson with 2–3 quizzes, the first required, and a chapter", () => {
    const manifest = track();
    const activities = new Map(manifest.activities.map((a) => [a.slug, a]));
    expect(manifest.lessons.length).toBeGreaterThanOrEqual(30);
    for (const lesson of manifest.lessons) {
      const used = lesson.blocks.flatMap((b) =>
        b.type === "activity" ? [b] : []
      );
      expect(used.length, lesson.slug).toBeGreaterThanOrEqual(2);
      expect(used.length, lesson.slug).toBeLessThanOrEqual(3);
      expect(used[0]!.required, lesson.slug).toBe(true);
      const skills = new Set(
        used.flatMap((b) => activities.get(b.activitySlug)!.skillKeys)
      );
      expect(skills.size, lesson.slug).toBe(1);
      expect([...skills][0], lesson.slug).toMatch(/^py-/);
      expect(lesson.durationMinutes).toBeLessThanOrEqual(45);
      expect(lesson.chapter, lesson.slug).toBeTruthy();
    }
  });

  it("opens every lesson with a neutral one-sentence recap", () => {
    for (const { lesson, text } of markdown()) {
      const [recap] = fenced(text, "recap");
      expect(recap, lesson.slug).toBeDefined();
      expect(text.startsWith("```recap\n"), lesson.slug).toBe(true);
      expect(recap!.now, lesson.slug).toMatch(/^[А-ЯЁ][^.!?]*[.!]$/u);
    }
  });

  it("covers every item of the coverage index with its own card, and indexes every card", () => {
    const index = read("python-course/coverage-index.json") as Index;
    expect(Object.keys(index.topics)).toEqual(TOPICS);
    const listed = Object.values(index.topics).flatMap((topic) => topic.items);
    for (const topic of Object.values(index.topics))
      expect(topic.items.length, topic.title).toBeGreaterThan(0);
    const taught = new Set(cardNames());
    expect(
      listed.filter((item) => !taught.has(item)),
      "items without a card"
    ).toEqual([]);
    expect(
      [...taught].filter((name) => !listed.includes(name)),
      "cards missing from the index"
    ).toEqual([]);
    expect(listed.length).toBe(new Set(listed).size);
  });

  it("explains each item once, without repeating a card in another lesson", () => {
    const names = cardNames();
    expect(names.filter((name, i) => names.indexOf(name) !== i)).toEqual([]);
  });

  it("has no storyline: no scenes, no season characters and no café business", () => {
    for (const { lesson, text } of markdown())
      expect(text, lesson.slug).not.toMatch(/```story\n/);
    // \b is ASCII-only, so Cyrillic whole words use \p{L} lookarounds.
    const banned =
      /"(marta|sonya|dasha|kremen)"|zerno|(?<!\p{L})Зерн|кофе|латте|капучино|эспрессо|бариста|какао|чизкейк|напит|столик|сироп|(?<!\p{L})(раф\p{L}{0,2}|чай|гост[ьяеиюй]\p{L}*|Март[аыу]|Даш[аиуе]|Сон[яиеу]|чашк\p{L}*|Кремн\p{L}*|Кремень|Нексус\p{L}*|Баг\p{L}{0,2})(?!\p{L})/giu;
    expect([...new Set(JSON.stringify(track()).match(banned) ?? [])]).toEqual(
      []
    );
  });

  it("explains everything itself and never sends the learner elsewhere", () => {
    const text = JSON.stringify(track());
    const elsewhere =
      /(?<![\w.])MDN(?![\w.])|w3schools|stackoverflow|stack overflow|wikipedia|google\.|гугл|загугл|поищи|почитай (в|на)|читай документаци|подробнее (в|на) |\]\(https?:/giu;
    expect([...new Set(text.match(elsewhere) ?? [])]).toEqual([]);
    // Example addresses only: reserved example domains and the local machine.
    const hosts = [...text.matchAll(/https?:\/\/([a-z0-9.-]+)/gi)].map(
      (m) => m[1]!
    );
    expect(
      hosts.filter(
        (host) =>
          !/(^|\.)example(\.(com|net|org))?$|^localhost$|^127\.0\.0\.1$/.test(
            host
          )
      )
    ).toEqual([]);
  });

  it("avoids Markdown the lesson renderer does not support (no GFM tables or task lists)", () => {
    for (const { lesson, text } of markdown()) {
      const prose = text.replace(/```[\s\S]*?```/g, "");
      expect(prose, lesson.slug).not.toMatch(/^\s*\|.*\|\s*$/m);
      expect(prose, lesson.slug).not.toMatch(/^\s*- \[[ x]\]/m);
    }
  });

  it("keeps markup out of questions and answer keys coherent", () => {
    for (const activity of track().activities.filter(isQuizActivity)) {
      const outsideCode = activity.presentation.question.replace(
        /`[^`]*`/g,
        ""
      );
      expect(outsideCode, activity.slug).not.toMatch(/<[a-z/][^>]*>|&[a-z]+;/i);
      expect(
        activity.validation.explanation?.length,
        activity.slug
      ).toBeGreaterThan(10);
      if (activity.type === "quiz.short_text") {
        expect(activity.validation.acceptedAnswers.length).toBeGreaterThan(0);
        continue;
      }
      const ids = new Set(activity.presentation.options.map((o) => o.id));
      expect(ids.size, activity.slug).toBeGreaterThanOrEqual(3);
      if (activity.type === "quiz.single_choice")
        expect(ids.has(activity.validation.correctOptionId)).toBe(true);
      else
        expect(
          activity.validation.correctOptionIds.every((id) => ids.has(id))
        ).toBe(true);
    }
  });
});
