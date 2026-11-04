import { describe, expect, it } from "vitest";

import { cityPlan, districtState } from "./city";

describe("city map", () => {
  it("rebuilds a district as its skills become active", () => {
    expect(districtState(0)).toBe("ruined");
    expect(districtState(0.19)).toBe("ruined");
    expect(districtState(0.2)).toBe("scaffolding");
    expect(districtState(0.99)).toBe("scaffolding");
    expect(districtState(1)).toBe("alive");
  });

  it("places every character and draws roads where one builds on another", () => {
    const plan = cityPlan(
      new Map([
        ["web-how-it-works", { confirmedDays: ["2026-11-05"] }],
        ["web-tools", { confirmedDays: ["2026-11-05"] }]
      ]),
      "2026-11-05"
    );
    expect(plan.districts.map((d) => d.character.slug)).toEqual([
      "pc",
      "browser",
      "html",
      "css",
      "js",
      "sql"
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
