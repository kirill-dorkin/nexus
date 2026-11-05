import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { SKILL_BRANCHES } from "./skill-branches.generated";
import { branchPartKey, pickQuestions } from "./skill-test-draw.policy";

const keys = [...Array(12)].map((_, i) => `q-${i}`);

describe("skill test draws (ADR-0075)", () => {
  it("takes distinct questions, the least seen first", () => {
    const seen = new Map(keys.slice(0, 9).map((k) => [k, 1] as const));
    for (let run = 0; run < 20; run++) {
      const drawn = pickQuestions(keys, seen, 5);
      expect(new Set(drawn).size).toBe(5);
      expect(drawn.slice(0, 3).sort()).toEqual(["q-10", "q-11", "q-9"]);
    }
  });

  it("breaks ties at random", () => {
    const first = new Set<string>();
    for (let run = 0; run < 50; run++)
      first.add(pickQuestions(keys, new Map(), 1)[0]!);
    expect(first.size).toBeGreaterThan(3);
  });

  it("derives a stable UUID per skill of a branch draw", () => {
    const drawKey = "0194f6c2-1b2c-7d3e-8f40-123456789abc";
    const a = branchPartKey(drawKey, "tags");
    expect(a).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-8[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
    );
    expect(branchPartKey(drawKey, "tags")).toBe(a);
    expect(branchPartKey(drawKey, "attributes")).not.toBe(a);
  });

  it("copies the branches of the Web skill map (run scripts/sync-skill-branches.mjs)", () => {
    const map = JSON.parse(
      readFileSync(
        new URL(
          "../../../../../web/src/lib/skill-map/skill-map.json",
          import.meta.url
        ),
        "utf8"
      )
    ) as {
      characters: { branches: { id: string; skills: { key: string }[] }[] }[];
    };
    expect(SKILL_BRANCHES).toEqual(
      Object.fromEntries(
        map.characters.flatMap((c) =>
          c.branches.map((b) => [b.id, b.skills.map((s) => s.key)])
        )
      )
    );
  });
});
