import { describe, expect, it } from "vitest";
import { checkQuizRequestSchema, quizCheckResultSchema } from "./quiz-check";
const command = {
  attemptKey: "018f071a-1234-7000-8000-000000000001",
  answer: { type: "quiz.single_choice", optionId: "a" }
};
describe("quiz check boundary", () => {
  it("accepts only a retry key and typed learner work", () => {
    expect(checkQuizRequestSchema.parse(command)).toEqual(command);
    for (const field of [
      "userId",
      "organizationId",
      "enrollmentId",
      "submissionId",
      "activityVersionId",
      "outcome",
      "passed",
      "score",
      "validatorKey",
      "validatorConfig",
      "evidenceTrust"
    ])
      expect(
        checkQuizRequestSchema.safeParse({ ...command, [field]: "caller" })
          .success
      ).toBe(false);
    expect(
      checkQuizRequestSchema.safeParse({
        ...command,
        answer: { ...command.answer, passed: true }
      }).success
    ).toBe(false);
  });
  it("rejects duplicate sets and blank text", () => {
    for (const answer of [
      { type: "quiz.multiple_choice", optionIds: ["a", "a"] },
      { type: "quiz.short_text", text: " " }
    ])
      expect(
        checkQuizRequestSchema.safeParse({ ...command, answer }).success
      ).toBe(false);
  });
  it("allows no private/raw result fields in feedback", () => {
    const result = {
      attemptNumber: 1,
      outcome: "passed",
      score: 1,
      feedback: "Correct"
    };
    expect(quizCheckResultSchema.parse(result)).toEqual(result);
    for (const field of [
      "correctOptionId",
      "correctOptionIds",
      "acceptedAnswers",
      "explanation",
      "payload",
      "validatorConfig",
      "submissionId"
    ])
      expect(
        quizCheckResultSchema.safeParse({ ...result, [field]: "private" })
          .success
      ).toBe(false);
  });
});
