import { describe, expect, it } from "vitest";

import { skillStateText, skillsWord } from "./character-labels";

const skill = { key: "k", title: "Навык", lesson: null };
const freshness = {
  state: "confirmed" as const,
  step: 1,
  dueOn: "2026-11-08",
  forgottenAfter: "2026-11-15"
};

describe("character labels", () => {
  it("says when to repeat and when a skill will be forgotten", () => {
    expect(skillStateText({ skill, state: "confirmed", freshness })).toBe(
      "Подтверждён, повторить до 8 ноября"
    );
    expect(
      skillStateText({
        skill,
        state: "fading",
        freshness: { ...freshness, state: "fading" }
      })
    ).toBe("Тускнеет: повторите до 15 ноября");
    expect(
      skillStateText({
        skill,
        state: "locked",
        freshness: { ...freshness, state: "unconfirmed" }
      })
    ).toMatch(/^Закрыт/);
  });

  it("declines the word «навык»", () => {
    expect([1, 2, 5, 11, 21, 22, 114].map(skillsWord)).toEqual([
      "навык",
      "навыка",
      "навыков",
      "навыков",
      "навык",
      "навыка",
      "навыков"
    ]);
  });
});
