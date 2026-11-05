import { describe, expect, it } from "vitest";

import { manifestOptions } from "./manifest-schema";

describe("skill bank minimum for fixtures (ADR-0075)", () => {
  it("lowers the minimum only off Vercel and never below a draw", () => {
    expect(manifestOptions({})).toEqual({});
    expect(manifestOptions({ SKILL_TEST_MIN_QUESTIONS: "5" })).toEqual({
      minQuestionsPerSkill: 5
    });
    expect(
      manifestOptions({ SKILL_TEST_MIN_QUESTIONS: "5", VERCEL: "1" })
    ).toEqual({});
    expect(manifestOptions({ SKILL_TEST_MIN_QUESTIONS: "1" })).toEqual({});
    expect(manifestOptions({ SKILL_TEST_MIN_QUESTIONS: "x" })).toEqual({});
  });
});
