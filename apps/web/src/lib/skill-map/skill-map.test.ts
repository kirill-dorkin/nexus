import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import {
  SKILL_MAP,
  characterProgress,
  findCharacter,
  requiredCharacters,
  type SkillMap
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
  maxLevel: 100,
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
const base = tiny.characters[0]!;
const top = tiny.characters[1]!;
const records = (entries: Record<string, string[]>) =>
  new Map(
    Object.entries(entries).map(([key, confirmedDays]) => [
      key,
      { confirmedDays }
    ])
  );
const today = "2026-11-05";

describe("character progress", () => {
  it("starts at level 0; a branch stays locked until half of its requirement is active", () => {
    const fresh = characterProgress(top, records({}), today, tiny);
    expect(fresh.level).toBe(0);
    expect(fresh.rank).toBe("Новичок");
    expect(fresh.branches[0]!.unlocked).toBe(false);
    expect(fresh.branches[0]!.skills[0]!.state).toBe("locked");
    expect(fresh.next).toBeNull();

    const half = characterProgress(
      top,
      records({ b1: ["2026-11-04"] }),
      today,
      tiny
    );
    expect(half.branches[0]!.unlocked).toBe(true);
    expect(half.next).toMatchObject({
      action: "confirm",
      skill: { key: "t0" }
    });
  });

  it("counts only active skills into the level, and forgetting lowers it", () => {
    const progress = characterProgress(
      top,
      records({
        b1: ["2026-11-04"],
        t0: ["2026-11-04"],
        t1: ["2026-10-30"],
        t2: ["2026-10-01"]
      }),
      today,
      tiny
    );
    expect(
      progress.branches[0]!.skills.slice(0, 4).map((s) => s.state)
    ).toEqual(["confirmed", "fading", "forgotten", "open"]);
    expect(progress.active).toBe(2);
    expect(progress.level).toBe(20);
    expect(progress.rank).toBe("Ученик");
    expect(progress.fading).toBe(1);
    expect(progress.forgotten).toBe(1);
    expect(progress.xp).toBe(300);
    expect(progress.next).toMatchObject({
      action: "repeat",
      skill: { key: "t1" }
    });
  });

  it("recalls a forgotten skill before confirming new ones", () => {
    const progress = characterProgress(
      top,
      records({ b1: ["2026-11-04"], t3: ["2026-09-01"] }),
      today,
      tiny
    );
    expect(progress.next).toMatchObject({
      action: "recall",
      skill: { key: "t3" }
    });
  });

  it("keeps experience from spaced repeats even after a skill is forgotten", () => {
    const progress = characterProgress(
      base,
      records({ b1: ["2026-01-01", "2026-01-04", "2026-01-11"] }),
      today,
      tiny
    );
    expect(progress.forgotten).toBe(1);
    expect(progress.level).toBe(0);
    expect(progress.xp).toBe(150);
  });

  it("prefers the API's freshness over the latest days it lists", () => {
    // The API saw a long history and says step 4 and fading; the days alone would say forgotten.
    const progress = characterProgress(
      base,
      new Map([
        [
          "b1",
          {
            confirmedDays: ["2026-09-01"],
            freshness: {
              state: "fading" as const,
              step: 4,
              dueOn: "2026-11-01",
              forgottenAfter: "2026-11-08"
            }
          }
        ]
      ]),
      today,
      tiny
    );
    expect(progress.branches[0]!.skills[0]!.state).toBe("fading");
    expect(progress.active).toBe(1);
  });

  it("reaches the top level and rank with every skill active", () => {
    const progress = characterProgress(
      base,
      records({ b1: ["2026-11-04"], b2: ["2026-11-05"] }),
      today,
      tiny
    );
    expect(progress.level).toBe(100);
    expect(progress.rank).toBe("Легенда");
    expect(progress.next).toBeNull();
  });

  it("names the characters a character builds on", () => {
    expect(requiredCharacters(top, tiny).map((c) => c.slug)).toEqual(["base"]);
    // A copy (as passed from a server page to a client one) still excludes itself.
    expect(
      requiredCharacters(structuredClone(findCharacter("html")!)).map(
        (c) => c.slug
      )
    ).toEqual(["browser", "js"]);
    expect(requiredCharacters(findCharacter("js")!).map((c) => c.slug)).toEqual(
      ["html", "css"]
    );
  });
});
