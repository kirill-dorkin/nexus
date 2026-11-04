import { describe, expect, it } from "vitest";

import { dailyQuests, playerLevel, streak } from "./daily";

const records = (entries: Record<string, string[]>) =>
  new Map(
    Object.entries(entries).map(([key, confirmedDays]) => [
      key,
      { confirmedDays }
    ])
  );

describe("daily quests", () => {
  it("offers the first open skills to a newcomer", () => {
    const quests = dailyQuests(records({}), "2026-11-05");
    expect(quests.map((q) => q.kind)).toEqual(["confirm", "confirm"]);
    expect(quests[0]!.character.slug).toBe("browser");
    expect(quests.every((q) => !q.done)).toBe(true);
  });

  it("puts a fading skill first and marks quests done today", () => {
    const quests = dailyQuests(
      records({
        "web-how-it-works": ["2026-10-30"],
        "web-tools": ["2026-11-05"]
      }),
      "2026-11-05"
    );
    expect(quests[0]).toMatchObject({
      kind: "repeat",
      skill: { key: "web-how-it-works" },
      done: false
    });
    expect(quests.find((q) => q.skill.key === "web-tools")?.done).toBe(true);
  });

  it("asks to recall a forgotten skill when nothing fades", () => {
    const quests = dailyQuests(
      records({ "web-how-it-works": ["2026-09-01"] }),
      "2026-11-05"
    );
    expect(quests[0]).toMatchObject({
      kind: "recall",
      skill: { key: "web-how-it-works" }
    });
  });
});

describe("streak", () => {
  it("counts consecutive days ending today or yesterday", () => {
    const r = records({
      a: ["2026-11-03", "2026-11-04"],
      b: ["2026-11-05", "2026-11-01"]
    });
    expect(streak(r, "2026-11-05")).toBe(3);
    expect(streak(r, "2026-11-06")).toBe(3);
    expect(streak(r, "2026-11-07")).toBe(0);
    expect(streak(records({}), "2026-11-05")).toBe(0);
  });
});

describe("player level", () => {
  it("sums character levels into a titled player level", () => {
    expect(playerLevel(records({}), "2026-11-05")).toEqual({
      level: 0,
      title: "Новичок"
    });
    const browser = playerLevel(
      records({
        "web-how-it-works": ["2026-11-05"],
        "web-tools": ["2026-11-05"]
      }),
      "2026-11-05"
    );
    expect(browser.level).toBeGreaterThanOrEqual(100);
    expect(browser.title).toBe("Подмастерье");
  });
});
