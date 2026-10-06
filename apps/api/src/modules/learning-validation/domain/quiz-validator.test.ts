import { describe, expect, it } from "vitest";
import type { ManifestActivity } from "@platform/contracts";
import { validateQuizAnswerV1 } from "./quiz-validator";
import { ValidatorRegistry } from "./validator-registry";
const base = {
  slug: "check",
  title: "Quiz",
  instructions: "",
  skillKeys: ["skill"]
};
const presentation = {
  question: "Q",
  options: [
    { id: "a", text: "A" },
    { id: "b", text: "B" },
    { id: "c", text: "C" }
  ]
};
const single: ManifestActivity = {
  ...base,
  type: "quiz.single_choice",
  presentation,
  validation: { correctOptionId: "b", explanation: "private" }
};
const multi: ManifestActivity = {
  ...base,
  type: "quiz.multiple_choice",
  presentation,
  validation: { correctOptionIds: ["a", "c"], explanation: "private" }
};
const text = (caseSensitive = false): ManifestActivity => ({
  ...base,
  type: "quiz.short_text",
  presentation: { question: "Q" },
  validation: {
    acceptedAnswers: ["Café", "second answer"],
    caseSensitive,
    explanation: "private"
  }
});
describe("deterministic quiz v1", () => {
  it("pins trusted computed authority for three exact versions", () => {
    for (const key of [single.type, multi.type, "quiz.short_text"]) {
      expect(new ValidatorRegistry().find(key, 1)).toEqual({
        key,
        version: 1,
        recordingAuthority: "deterministic_quiz",
        evidenceTrust: "trusted"
      });
      expect(new ValidatorRegistry().find(key, 2)).toBeNull();
    }
  });
  it("single choice checks exact option identity without returning protected fields", () => {
    expect(
      validateQuizAnswerV1(single, { type: single.type, optionId: "b" })
    ).toEqual({ outcome: "passed", score: 1 });
    expect(
      validateQuizAnswerV1(single, { type: single.type, optionId: "a" })
    ).toEqual({ outcome: "failed", score: 0 });
  });
  it("rejects unknown choice instead of recording learner failure", () => {
    expect(() =>
      validateQuizAnswerV1(single, { type: single.type, optionId: "unknown" })
    ).toThrow("Unknown");
  });
  it.each([
    ["c", "a"],
    ["a", "c"]
  ])("multi choice is an order-independent exact set %j", (...ids) => {
    expect(
      validateQuizAnswerV1(multi, { type: multi.type, optionIds: ids })
    ).toEqual({ outcome: "passed", score: 1 });
  });
  it.each([["a"], ["a", "b", "c"], ["b"]])(
    "gives no partial credit for %j",
    (...ids) => {
      expect(
        validateQuizAnswerV1(multi, { type: multi.type, optionIds: ids })
      ).toEqual({ outcome: "failed", score: 0 });
    }
  );
  it("rejects duplicate selections and unknown choices", () => {
    expect(() =>
      validateQuizAnswerV1(multi, {
        type: multi.type,
        optionIds: ["a", "a", "c"]
      })
    ).toThrow();
    expect(() =>
      validateQuizAnswerV1(multi, {
        type: multi.type,
        optionIds: ["a", "unknown"]
      })
    ).toThrow();
  });
  it("normalizes NFC then trim then non-locale lowercase", () => {
    expect(
      validateQuizAnswerV1(text(), {
        type: "quiz.short_text",
        text: "  CAFE\u0301\n"
      })
    ).toEqual({ outcome: "passed", score: 1 });
    expect(
      validateQuizAnswerV1(text(), {
        type: "quiz.short_text",
        text: " SECOND ANSWER "
      })
    ).toEqual({ outcome: "passed", score: 1 });
  });
  it("case sensitivity preserves case after NFC and trim", () => {
    expect(
      validateQuizAnswerV1(text(true), {
        type: "quiz.short_text",
        text: " Cafe\u0301 "
      }).outcome
    ).toBe("passed");
    expect(
      validateQuizAnswerV1(text(true), {
        type: "quiz.short_text",
        text: "CAFÉ"
      }).outcome
    ).toBe("failed");
  });
  it("does not normalize compatibility characters, internal spaces or fuzzy answers", () => {
    for (const value of ["Ｃａｆé", "second  answer", "cafe", "café extra"])
      expect(
        validateQuizAnswerV1(text(), { type: "quiz.short_text", text: value })
          .outcome
      ).toBe("failed");
  });
  it("rejects empty text, overlong input and a mismatched answer type", () => {
    expect(() =>
      validateQuizAnswerV1(text(), { type: "quiz.short_text", text: "  " })
    ).toThrow();
    expect(() =>
      validateQuizAnswerV1(text(), {
        type: "quiz.short_text",
        text: "x".repeat(2001)
      })
    ).toThrow();
    expect(() =>
      validateQuizAnswerV1(single, { type: "quiz.short_text", text: "b" })
    ).toThrow();
  });
});
