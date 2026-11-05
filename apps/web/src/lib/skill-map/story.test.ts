import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { SKILL_MAP } from "./skill-map";
import { CAST, scenesFor, type BranchScene } from "./story";

type Builder = {
  storyOutputPath: string;
  buildStory: () => Record<string, BranchScene>;
  serialize: (value: unknown) => string;
};
const builderUrl = new URL(
  "../../../../../docs/examples/skill-map/build.mjs",
  import.meta.url
).href;
const { buildStory, serialize, storyOutputPath } = (await import(
  builderUrl
)) as Builder;

const banned = /Зерно|кофейн|Марта|Соня|Даша|https?:\/\//i;

describe("season-1 scenes (docs/story/season-1.md)", () => {
  it("is current: rebuild with node docs/examples/skill-map/build.mjs", () => {
    expect(readFileSync(storyOutputPath, "utf8")).toBe(serialize(buildStory()));
  });

  it("gives every branch an intro and an outro from known speakers", () => {
    const ids = SKILL_MAP.characters.flatMap((c) =>
      c.branches.map((b) => b.id)
    );
    const scenes = scenesFor(ids);
    expect(Object.keys(scenes)).toHaveLength(ids.length);
    for (const scene of Object.values(scenes))
      for (const [who, text] of [
        ...scene.intro,
        ...(scene.boss ?? []),
        ...scene.outro
      ]) {
        expect(CAST[who]).toBeDefined();
        expect(text.length).toBeGreaterThan(0);
        expect(text.length).toBeLessThanOrEqual(140);
        expect(text).not.toMatch(banned);
      }
  });

  it("has fights with Bug at the ends of the project branches", () => {
    const fights = Object.entries(
      scenesFor(
        SKILL_MAP.characters.flatMap((c) => c.branches.map((b) => b.id))
      )
    )
      .filter(([, scene]) => scene.boss)
      .map(([id]) => id);
    expect(fights).toEqual([
      "html-8",
      "html-9",
      "html-11",
      "html-12",
      "css-3",
      "css-5",
      "css-6",
      "css-8",
      "css-11",
      "js-3",
      "js-8",
      "js-10",
      "js-11",
      "sql-11"
    ]);
  });
});
