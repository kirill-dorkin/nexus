import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import {
  SKILL_MAP,
  characterProgress,
  findCharacter,
  type SkillMap
} from "./skill-map";
import { requiredCharacters } from "./required-characters";

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
  "terminal-track",
  "git-track",
  "ts-track",
  "node-track",
  "react-track",
  "network-track",
  "python-track",
  "pc-track",
  "browser-track"
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

  it("has the starting characters, each with skills and a description", () => {
    expect(SKILL_MAP.characters.map((c) => c.slug)).toEqual([
      "pc",
      "browser",
      "html",
      "css",
      "js",
      "sql",
      "terminal",
      "git",
      "ts",
      "node",
      "react",
      "network",
      "python"
    ]);
    for (const c of SKILL_MAP.characters) {
      expect(c.branches.length).toBeGreaterThan(0);
      expect(c.summary.length).toBeGreaterThan(20);
      expect(c.role.length).toBeGreaterThan(3);
    }
  });

  it("links published skills to their own course's lessons", () => {
    const html = findCharacter("html")!;
    expect(html.branches[0]!.skills[0]!.lesson?.course).toBe("html");
    // ПК and Браузер were published on 2026-11-06.
    for (const slug of ["pc", "browser"])
      for (const skill of findCharacter(slug)!.branches.flatMap(
        (b) => b.skills
      ))
        expect(skill.lesson?.course).toBe(slug);
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
      abilities: [{ title: "Base", branches: ["base-1"] }],
      branches: [
        {
          id: "base-1",
          title: "B1",
          depth: "practice",
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
      abilities: [],
      branches: [
        {
          id: "top-1",
          title: "T1",
          depth: "practice",
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

  it("does not lock a published branch behind a character that is not published yet", () => {
    const draft = {
      ...tiny,
      characters: [{ ...base, published: false }, top]
    };
    const progress = characterProgress(top, records({}), today, draft);
    expect(progress.branches[0]!.unlocked).toBe(true);
    // With Браузер published, HTML's first branch waits for Браузер's second branch.
    expect(findCharacter("html")!.branches[0]!.requires).toContain("browser-2");
    const html = characterProgress(findCharacter("html")!, records({}), today);
    expect(html.branches[0]!.unlocked).toBe(false);
    // A locked branch names what it waits for, so the page can link to it.
    expect(html.branches[0]!.waitsFor).toContainEqual(
      expect.objectContaining({
        branchId: "browser-2",
        characterSlug: "browser",
        characterName: "Браузер"
      })
    );
    expect(progress.branches[0]!.waitsFor).toEqual([]);
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

  it("weights core skills three times as much as reference ones (level@2)", () => {
    const weighted: SkillMap = {
      ...tiny,
      characters: [
        {
          ...base,
          abilities: [],
          branches: [
            {
              id: "w-1",
              title: "Core",
              depth: "core",
              requires: [],
              skills: [{ key: "c1", title: "c1", lesson: null }]
            },
            {
              id: "w-2",
              title: "Reference",
              depth: "reference",
              requires: [],
              skills: [{ key: "r1", title: "r1", lesson: null }]
            }
          ]
        }
      ]
    };
    const character = weighted.characters[0]!;
    expect(
      characterProgress(character, records({ c1: [today] }), today, weighted)
        .level
    ).toBe(75);
    expect(
      characterProgress(character, records({ r1: [today] }), today, weighted)
        .level
    ).toBe(25);
  });

  it("lights an ability only while every skill of its branches is active", () => {
    const half = characterProgress(base, records({ b1: [today] }), today, tiny);
    expect(half.abilities[0]).toMatchObject({
      active: false,
      activeSkills: 1,
      totalSkills: 2
    });
    const full = characterProgress(
      base,
      records({ b1: [today], b2: [today] }),
      today,
      tiny
    );
    expect(full.abilities[0]?.active).toBe(true);
    const forgotten = characterProgress(
      base,
      records({ b1: [today], b2: ["2026-09-01"] }),
      today,
      tiny
    );
    expect(forgotten.abilities[0]?.active).toBe(false);
  });

  it("every real character has abilities and every branch a depth", () => {
    for (const character of SKILL_MAP.characters) {
      expect(character.abilities.length).toBeGreaterThan(0);
      for (const branch of character.branches)
        expect([
          "core",
          "practice",
          "advanced",
          "reference",
          "internals"
        ]).toContain(branch.depth);
    }
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
