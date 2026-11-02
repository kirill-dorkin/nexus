// @vitest-environment happy-dom
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseChallenge, runChecks } from "./challenge";
import { parseConcept, parseRecap, parseStory } from "./story";

type Manifest = { lessons: { slug: string; blocks: { type: string; markdown?: string }[] }[] };
// Tests run from the repository root (see vitest.config.ts).
const courses: [string, Manifest][] = [
  ["HTML", JSON.parse(readFileSync("docs/examples/html-track.manifest.json", "utf8")) as Manifest],
  ["CSS", JSON.parse(readFileSync("docs/examples/css-track.manifest.json", "utf8")) as Manifest]
];
const run = (code: string, challenge: NonNullable<ReturnType<typeof parseChallenge>>) =>
  runChecks(code, challenge.checks, new DOMParser().parseFromString(code, "text/html"));

for (const [name, manifest] of courses) {
  const blocks = (lang: string) => manifest.lessons.flatMap((lesson) =>
    lesson.blocks.flatMap((block) =>
      [...(block.markdown ?? "").matchAll(new RegExp("```" + lang + "\\n([\\s\\S]*?)\\n```", "g"))].map((m) => ({ lesson: lesson.slug, source: m[1]! }))
    )
  );
  const fences = blocks("challenge");

  describe(`${name} course challenges`, () => {
    it("every lesson has hands-on practice", () => {
      const withPractice = new Set(fences.map((f) => f.lesson));
      expect(manifest.lessons.filter((l) => !withPractice.has(l.slug)).map((l) => l.slug)).toEqual([]);
    });
    it.each(fences.map((f, i) => [`${f.lesson} #${i}`, f.source] as const))("%s is valid and solvable", (_, source) => {
      const challenge = parseChallenge(source);
      expect(challenge, source).not.toBeNull();
      expect(challenge!.solution, "a solution is required").toBeTruthy();
      expect(run(challenge!.solution!, challenge!), "the solution must pass every check").not.toContain(false);
      expect(run(challenge!.start, challenge!), "the starting code must not already pass").toContain(false);
    });
  });

  describe(`${name} course story blocks`, () => {
    it("every scene and concept card is valid, so none falls back to raw JSON", () => {
      expect(blocks("story").filter((b) => !parseStory(b.source)).map((b) => b.lesson)).toEqual([]);
      expect(blocks("concept").filter((b) => !parseConcept(b.source)).map((b) => b.lesson)).toEqual([]);
      expect(blocks("story").length).toBeGreaterThanOrEqual(manifest.lessons.length);
      // Every lesson opens with the story context, so it works on its own.
      const recaps = blocks("recap");
      expect(recaps.filter((b) => !parseRecap(b.source)).map((b) => b.lesson)).toEqual([]);
      expect(manifest.lessons.filter((l) => !recaps.some((r) => r.lesson === l.slug)).map((l) => l.slug)).toEqual([]);
    });
  });
}

describe("challenge checks", () => {
  it("matches selectors, text, attributes, counts, absence and source fragments", () => {
    const checks = [
      { label: "h1", selector: "h1", text: "привет" },
      { label: "alt", selector: "img", attr: "alt" },
      { label: "two li", selector: "li", count: 2 },
      { label: "no b", selector: "b", absent: true },
      { label: "doctype", contains: "<!doctype html>" },
      { label: "lang", selector: "html", attr: "lang", value: "ru" }
    ];
    const ok = '<!DOCTYPE html><html lang="ru"><h1>Привет,  мир</h1><img src="a.png" alt=""><ul><li>1</li><li>2</li></ul></html>';
    expect(runChecks(ok, checks, new DOMParser().parseFromString(ok, "text/html"))).toEqual([true, true, true, true, true, true]);
    const bad = "<h1>Hi</h1><img src=a.png><li>1</li><b>x</b>";
    expect(runChecks(bad, checks, new DOMParser().parseFromString(bad, "text/html"))).toEqual([false, false, false, false, false, false]);
  });
  it("rejects malformed specs", () => {
    expect(parseChallenge("{")).toBeNull();
    expect(parseChallenge('{"title":"t","task":"x","start":"","checks":[{"label":"a"}]}')).toBeNull();
    expect(parseChallenge('{"title":"t","task":"x","start":"","checks":[{"label":"a","selector":"p","contains":"p"}]}')).toBeNull();
    expect(parseChallenge('{"title":"t","task":"x","start":"","checks":[{"label":"a","selector":"p"}]}')).not.toBeNull();
  });
});
