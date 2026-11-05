import {
  isSkillTestAnswerCorrect,
  type SkillTestAnswer,
  type SkillTestQuestion
} from "@platform/contracts";

/** The questions one draw showed for one skill, with that skill's bank. */
export type SkillTestDrawnPart = Readonly<{
  skillKey: string;
  questionKeys: readonly string[];
  bank: readonly SkillTestQuestion[];
}>;

export type SkillTestEvaluation = Readonly<{
  outcome: "passed" | "failed";
  /** Share of correct answers, as stored in numeric(6,5). */
  score: number;
  correctCount: number;
  total: number;
  threshold: number;
  questions: readonly Readonly<{
    skillKey: string;
    key: string;
    correct: boolean;
  }>[];
}>;

/** The answers do not cover exactly the drawn questions. */
export class SkillTestAnswersMismatch extends Error {}

const id = (skillKey: string, key: string) => `${skillKey}\u0000${key}`;

/**
 * `skill_test@1`: grades exactly the drawn questions, each answered once, against the
 * bank. Answers to anything else, missing answers and repeats are refused.
 */
export function evaluateSkillTest(
  parts: readonly SkillTestDrawnPart[],
  answers: readonly SkillTestAnswer[],
  threshold: number
): SkillTestEvaluation {
  const given = new Map<string, SkillTestAnswer>();
  for (const answer of answers) {
    const at = id(answer.skillKey, answer.key);
    if (given.has(at)) throw new SkillTestAnswersMismatch("Repeated answer.");
    given.set(at, answer);
  }
  const questions: { skillKey: string; key: string; correct: boolean }[] = [];
  for (const part of parts) {
    const bank = new Map(part.bank.map((q) => [q.key, q] as const));
    for (const key of part.questionKeys) {
      const question = bank.get(key);
      if (!question) throw new Error("A drawn question left the bank.");
      const answer = given.get(id(part.skillKey, key));
      if (!answer) throw new SkillTestAnswersMismatch("Missing answer.");
      given.delete(id(part.skillKey, key));
      questions.push({
        skillKey: part.skillKey,
        key,
        correct: isSkillTestAnswerCorrect(question, answer)
      });
    }
  }
  if (given.size) throw new SkillTestAnswersMismatch("Undrawn question.");
  const correctCount = questions.filter((q) => q.correct).length;
  const total = questions.length;
  return {
    outcome: correctCount >= threshold ? "passed" : "failed",
    score: Math.round((correctCount / total) * 100_000) / 100_000,
    correctCount,
    total,
    threshold,
    questions
  };
}
