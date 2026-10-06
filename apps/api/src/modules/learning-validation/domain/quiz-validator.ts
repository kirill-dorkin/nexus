import { BadRequestException } from "@nestjs/common";
import {
  quizAnswerSchema,
  type QuizAnswer,
  type ManifestActivity
} from "@platform/contracts";

/** quiz.*@1 semantics are pinned by ADR-0053; incompatible changes need a new registry version. */
export function validateQuizAnswerV1(
  definition: ManifestActivity,
  input: QuizAnswer
) {
  const parsed = quizAnswerSchema.safeParse(input);
  if (!parsed.success || parsed.data.type !== definition.type)
    throw new BadRequestException("Answer does not match this quiz.");
  const answer = parsed.data;
  let passed: boolean;
  if (
    definition.type === "quiz.single_choice" &&
    answer.type === "quiz.single_choice"
  ) {
    if (!definition.presentation.options.some((o) => o.id === answer.optionId))
      throw new BadRequestException("Unknown quiz option.");
    passed = answer.optionId === definition.validation.correctOptionId;
  } else if (
    definition.type === "quiz.multiple_choice" &&
    answer.type === "quiz.multiple_choice"
  ) {
    if (
      answer.optionIds.some(
        (id) => !definition.presentation.options.some((o) => o.id === id)
      )
    )
      throw new BadRequestException("Unknown quiz option.");
    passed =
      answer.optionIds.length ===
        definition.validation.correctOptionIds.length &&
      definition.validation.correctOptionIds.every((id) =>
        answer.optionIds.includes(id)
      );
  } else if (
    definition.type === "quiz.short_text" &&
    answer.type === "quiz.short_text"
  ) {
    const normalize = (text: string) => {
      const value = text.normalize("NFC").trim();
      return definition.validation.caseSensitive ? value : value.toLowerCase();
    };
    passed = definition.validation.acceptedAnswers.some(
      (text) => normalize(text) === normalize(answer.text)
    );
  } else throw new BadRequestException("Answer does not match this quiz.");
  return {
    outcome: passed ? ("passed" as const) : ("failed" as const),
    score: passed ? (1 as const) : (0 as const)
  };
}
