import { describe, expect, it } from "vitest";

import { cityPlan, districtState } from "./city";
import { SKILL_MAP, findCharacter } from "./skill-map";

describe("city map", () => {
  it("rebuilds a district as its skills become active", () => {
    expect(districtState(0)).toBe("ruined");
    expect(districtState(0.19)).toBe("ruined");
    expect(districtState(0.2)).toBe("scaffolding");
    expect(districtState(0.99)).toBe("scaffolding");
    expect(districtState(1)).toBe("alive");
  });

  it("places every character and draws roads where one builds on another", () => {
    const browserSkills = findCharacter("browser")!.branches.flatMap((b) =>
      b.skills.map((s) => [s.key, { confirmedDays: ["2026-11-05"] }] as const)
    );
    const plan = cityPlan(new Map(browserSkills), "2026-11-05");
    expect(plan.districts.map((d) => d.character.slug)).toEqual([
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
      "python",
      "docker",
      "next",
      "go",
      "os",
      "vue",
      "cicd",
      "kubernetes",
      "webapi",
      "redis",
      "nestjs"
    ]);
    expect(
      plan.districts.find((d) => d.character.slug === "browser")
    ).toMatchObject({ name: "Ворота в Сеть", state: "alive", level: 100 });
    expect(plan.districts.find((d) => d.character.slug === "html")?.state).toBe(
      "ruined"
    );
    const roads = plan.roads.map((r) => [r.from, r.to].sort().join("-"));
    for (const road of [
      "browser-html",
      "css-html",
      "css-js",
      "html-js",
      "browser-pc"
    ])
      expect(roads).toContain(road);
  });
});

describe("a character without a planned district", () => {
  it("stands on the bottom row under its own name", () => {
    const stranger = {
      ...SKILL_MAP.characters[0]!,
      slug: "stranger",
      name: "Чужак"
    };
    const { districts } = cityPlan(new Map(), "2026-11-07", {
      ...SKILL_MAP,
      characters: [stranger]
    });
    expect(districts[0]).toMatchObject({ name: "Чужак", x: 130, y: 560 });
  });
});
