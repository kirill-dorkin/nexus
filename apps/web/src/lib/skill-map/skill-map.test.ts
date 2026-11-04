import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import {
  SKILL_MAP,
  characterProgress,
  findCharacter,
  requiredCharacters,
  type SkillMap,
  type SkillMastery
} from "./skill-map";

// The builder is plain JavaScript beside the course sources (docs/examples is not typed).
type Builder = {
  outputPath: string;
  buildSkillMap: (
    config?: unknown,
    readManifest?: (name: string) => unknown
  ) => SkillMap;
  serialize: (map: SkillMap) => string;
};
const builderUrl = new URL(
  "../../../../../docs/examples/skill-map/build.mjs",
  import.meta.url
).href;
const { buildSkillMap, outputPath, serialize } = (await import(
  builderUrl
)) as Builder;

const manifests = [
  "html-track",
  "css-track",
  "js-track",
  "sql-track",
  "computer-basics-first-course"
].map(
  (name) =>
    JSON.parse(
      readFileSync(
        new URL(
          `../../../../../docs/examples/${name}.manifest.json`,
          import.meta.url
        ),
        "utf8"
      )
    ) as { skills: { key: string }[] }
);

describe("skill map data (ADR-0074)", () => {
  it("is current: rebuild with node docs/examples/skill-map/build.mjs", () => {
    expect(readFileSync(outputPath, "utf8")).toBe(serialize(buildSkillMap()));
  });

  it("puts every skill of every course into exactly one character", () => {
    const mapped = SKILL_MAP.characters.flatMap((c) =>
      c.branches.flatMap((b) => b.skills.map((s) => s.key))
    );
    expect(new Set(mapped).size).toBe(mapped.length);
    const authored = manifests.flatMap((m) => m.skills.map((s) => s.key));
    expect(new Set(mapped)).toEqual(new Set(authored));
  });

  it("has the six starting characters, each with skills and a description", () => {
    expect(SKILL_MAP.characters.map((c) => c.slug)).toEqual([
      "pc",
      "browser",
      "html",
      "css",
      "js",
      "sql"
    ]);
    for (const c of SKILL_MAP.characters) {
      expect(c.branches.length).toBeGreaterThan(0);
      expect(c.summary.length).toBeGreaterThan(20);
      expect(c.role.length).toBeGreaterThan(3);
    }
  });

  it("links published skills to their lessons and hides unpublished ones", () => {
    const html = findCharacter("html")!;
    expect(html.branches[0]!.skills[0]!.lesson?.course).toBe("html");
    for (const skill of findCharacter("pc")!.branches.flatMap((b) => b.skills))
      expect(skill.lesson).toBeNull();
  });

  it("refuses a cycle and unknown references", () => {
    const base = {
      characters: [
        {
          slug: "a",
          name: "A",
          role: "Роль",
          summary: "s",
          accent: "lime",
          sources: [{ manifest: "a", published: true }]
        }
      ],
      unlockShare: 0.5,
      masteredScore: 0.8,
      maxLevel: 10
    };
    const manifest = {
      course: { slug: "a", title: "A" },
      skills: [
        { key: "a-1", title: "1" },
        { key: "a-2", title: "2" }
      ],
      activities: [
        { slug: "q1", skillKeys: ["a-1"] },
        { slug: "q2", skillKeys: ["a-2"] }
      ],
      lessons: [
        {
          slug: "l1",
          title: "L1",
          chapter: "One",
          blocks: [{ activitySlug: "q1" }]
        },
        {
          slug: "l2",
          title: "L2",
          chapter: "Two",
          blocks: [{ activitySlug: "q2" }]
        }
      ]
    };
    expect(() =>
      buildSkillMap(
        { ...base, requires: { "a/One": ["a/Two"] } },
        () => manifest
      )
    ).toThrow(/cycle/);
    expect(() =>
      buildSkillMap(
        { ...base, requires: { "a/One": ["b/Two"] } },
        () => manifest
      )
    ).toThrow(/unknown branch/);
  });
});

const tiny: SkillMap = {
  version: 1,
  unlockShare: 0.5,
  masteredScore: 0.8,
  maxLevel: 10,
  characters: [
    {
      slug: "base",
      name: "Base",
      role: "r",
      summary: "s",
      accent: "lime",
      published: true,
      branches: [
        {
          id: "base-1",
          title: "B1",
          requires: [],
          skills: [
            { key: "b1", title: "b1", lesson: null },
            { key: "b2", title: "b2", lesson: null }
          ]
        }
      ]
    },
    {
      slug: "top",
      name: "Top",
      role: "r",
      summary: "s",
      accent: "violet",
      published: true,
      branches: [
        {
          id: "top-1",
          title: "T1",
          requires: ["base-1"],
          skills: Array.from({ length: 10 }, (_, i) => ({
            key: `t${i}`,
            title: `t${i}`,
            lesson: null
          }))
        }
      ]
    }
  ]
};
const top = tiny.characters[1]!;
const base = tiny.characters[0]!;
const mastery = (entries: Record<string, SkillMastery>) =>
  new Map(Object.entries(entries));

describe("character progress", () => {
  it("starts at level 0 with a locked branch until its requirement is half mastered", () => {
    const fresh = characterProgress(top, mastery({}), tiny);
    expect(fresh.level).toBe(0);
    expect(fresh.xp).toBe(0);
    expect(fresh.branches[0]!.unlocked).toBe(false);
    expect(fresh.branches[0]!.states[0]).toBe("locked");
    expect(fresh.next).toBeNull();

    const half = characterProgress(
      top,
      mastery({ b1: { masteryScore: 0.9, evidenceCount: 1 } }),
      tiny
    );
    expect(half.branches[0]!.unlocked).toBe(true);
    expect(half.next?.skill.key).toBe("t0");
  });

  it("counts mastered skills into levels and evidence into progress", () => {
    const progress = characterProgress(
      top,
      mastery({
        b1: { masteryScore: 1, evidenceCount: 1 },
        t0: { masteryScore: 1, evidenceCount: 2 },
        t1: { masteryScore: 0.8, evidenceCount: 1 },
        t2: { masteryScore: 0.5, evidenceCount: 1 },
        t3: { masteryScore: null, evidenceCount: 1 }
      }),
      tiny
    );
    expect(progress.mastered).toBe(2);
    expect(progress.level).toBe(2);
    expect(progress.toNextLevel).toBe(1);
    expect(progress.xp).toBe(230);
    expect(progress.maxXp).toBe(1000);
    expect(progress.branches[0]!.states.slice(0, 5)).toEqual([
      "mastered",
      "mastered",
      "progress",
      "progress",
      "open"
    ]);
    expect(progress.next?.skill.key).toBe("t2");
  });

  it("reaches the top level with every skill mastered", () => {
    const all = Object.fromEntries(
      ["b1", "b2"].map((k) => [k, { masteryScore: 1, evidenceCount: 1 }])
    );
    const progress = characterProgress(base, mastery(all), tiny);
    expect(progress.level).toBe(10);
    expect(progress.toNextLevel).toBe(0);
    expect(progress.next).toBeNull();
  });

  it("names the characters a character builds on", () => {
    expect(requiredCharacters(top, tiny).map((c) => c.slug)).toEqual(["base"]);
    expect(requiredCharacters(findCharacter("js")!).map((c) => c.slug)).toEqual(
      ["html", "css"]
    );
  });
});
