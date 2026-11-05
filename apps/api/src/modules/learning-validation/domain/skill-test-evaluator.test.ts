import type { SkillTestQuestion } from "@platform/contracts";
import { describe, expect, it } from "vitest";

import {
  evaluateSkillTest,
  SkillTestAnswersMismatch
} from "./skill-test-evaluator";

const question = (key: string): SkillTestQuestion => ({
  key,
  kind: "single_choice",
  prompt: "?",
  options: [
    { id: "a", text: "A", explanation: "a" },
    { id: "b", text: "B", explanation: "b" }
  ],
  correct: ["a"],
  explanation: "a"
});
const bank = [...Array(6)].map((_, i) => question(`q-${i}`));
const drawn = ["q-0", "q-1", "q-2", "q-3", "q-4"];
const part = { skillKey: "tags", questionKeys: drawn, bank };
const answer = (key: string, id = "a") => ({
  skillKey: "tags",
  key,
  optionIds: [id]
});

describe("skill_test@1 grading", () => {
  it("passes at 4 of 5 and fails at 3 of 5", () => {
    const four = evaluateSkillTest(
      [part],
      drawn.map((k, i) => answer(k, i === 0 ? "b" : "a")),
      4
    );
    expect(four).toMatchObject({
      outcome: "passed",
      correctCount: 4,
      total: 5,
      score: 0.8
    });
    const three = evaluateSkillTest(
      [part],
      drawn.map((k, i) => answer(k, i < 2 ? "b" : "a")),
      4
    );
    expect(three).toMatchObject({ outcome: "failed", correctCount: 3 });
    expect(three.questions[0]).toEqual({
      skillKey: "tags",
      key: "q-0",
      correct: false
    });
  });

  it.each([
    ["a missing answer", drawn.slice(1).map((k) => answer(k))],
    ["an undrawn question", [...drawn.map((k) => answer(k)), answer("q-5")]],
    ["a repeated answer", [...drawn.map((k) => answer(k)), answer("q-0")]],
    [
      "another skill's question",
      [
        ...drawn.slice(1).map((k) => answer(k)),
        { ...answer("q-0"), skillKey: "other" }
      ]
    ]
  ])("refuses %s", (_name, answers) => {
    expect(() => evaluateSkillTest([part], answers, 4)).toThrow(
      SkillTestAnswersMismatch
    );
  });
});
