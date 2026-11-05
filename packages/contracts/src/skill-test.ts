import { z } from "zod";

import { resourceSlugSchema, uuidSchema } from "./common";

/**
 * ADR-0075: a skill is confirmed by a test drawn from a protected question bank.
 * The bank lives in the course manifest (`skillTests`), is stored server-side and
 * never reaches a learner except as the presentations of one draw.
 */
export const SKILL_TEST = {
  /** Questions in one draw of a skill test. */
  size: 5,
  /** Correct answers a skill test needs to pass. */
  threshold: 4,
  /** A bank needs this many questions per skill (fixtures may lower it, never below `size`). */
  minQuestionsPerSkill: 12,
  /** A failed test (or branch test) may be retaken after this many minutes. */
  cooldownMinutes: 10,
  /** Validation definition `skill_test@1`: validator key and version. */
  validatorKey: "skill.test",
  validatorVersion: 1
} as const;

/** Share of correct answers a branch test needs, the same 4 of 5 as a skill test. */
export const branchTestThreshold = (questions: number) =>
  Math.ceil((questions * SKILL_TEST.threshold) / SKILL_TEST.size);

/** Skill keys longer than this cannot name their `skill.test` activity slug. */
const MAX_TESTED_SKILL_KEY = 63 - "skill-test-".length;

/** The slug of the `skill.test` activity that carries the skill's bank. */
export const skillTestActivitySlug = (skillKey: string) =>
  `skill-test-${skillKey}`;

const key = z
  .string()
  .min(1)
  .max(63)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
const text2000 = z.string().trim().min(1).max(2000);

export const skillTestQuestionKinds = [
  "single_choice",
  "multiple_choice",
  "short_text",
  "code_output",
  "find_bug"
] as const;
export const skillTestQuestionKindSchema = z.enum(skillTestQuestionKinds);

export const skillTestCodeSchema = z
  .object({
    language: z.enum(["html", "css", "js", "ts", "sql", "text"]),
    source: z.string().min(1).max(4000)
  })
  .strict();

export const skillTestQuestionSchema = z
  .object({
    key,
    kind: skillTestQuestionKindSchema,
    prompt: text2000,
    code: skillTestCodeSchema.optional(),
    options: z
      .array(
        z.object({ id: key, text: text2000, explanation: text2000 }).strict()
      )
      .min(2)
      .max(8)
      .optional(),
    correct: z.array(key).max(8),
    accepted: z.array(text2000).min(1).max(50).optional(),
    caseSensitive: z.boolean().optional(),
    explanation: text2000
  })
  .strict();

export const manifestSkillTestSchema = z
  .object({
    skillKey: resourceSlugSchema,
    questions: z.array(skillTestQuestionSchema).min(1).max(400)
  })
  .strict();

export type SkillTestQuestion = z.infer<typeof skillTestQuestionSchema>;
export type ManifestSkillTest = z.infer<typeof manifestSkillTestSchema>;

export type SkillTestIssue = { path: (string | number)[]; message: string };

/**
 * Import rules of a bank: enough questions, unique keys, options where the kind needs them,
 * correct ids among the options, accepted answers only for short text.
 */
export function skillTestIssues(
  skillTests: readonly ManifestSkillTest[],
  manifestSkillKeys: ReadonlySet<string>,
  activitySlugs: ReadonlySet<string>,
  minQuestionsPerSkill: number = SKILL_TEST.minQuestionsPerSkill
): SkillTestIssue[] {
  const issues: SkillTestIssue[] = [];
  const minimum = Math.max(SKILL_TEST.size, minQuestionsPerSkill);
  const tested = new Set<string>();
  skillTests.forEach((test, index) => {
    const at = (...path: (string | number)[]) => ["skillTests", index, ...path];
    if (!manifestSkillKeys.has(test.skillKey))
      issues.push({
        path: at("skillKey"),
        message: `Unknown course skill: ${test.skillKey}.`
      });
    if (tested.has(test.skillKey))
      issues.push({
        path: at("skillKey"),
        message: `Duplicate skill test: ${test.skillKey}.`
      });
    tested.add(test.skillKey);
    if (test.skillKey.length > MAX_TESTED_SKILL_KEY)
      issues.push({
        path: at("skillKey"),
        message: `A tested skill key is at most ${MAX_TESTED_SKILL_KEY} characters.`
      });
    if (activitySlugs.has(skillTestActivitySlug(test.skillKey)))
      issues.push({
        path: at("skillKey"),
        message: `Activity slug ${skillTestActivitySlug(test.skillKey)} is reserved for the skill test.`
      });
    if (test.questions.length < minimum)
      issues.push({
        path: at("questions"),
        message: `A skill test needs at least ${minimum} questions.`
      });
    const keys = new Set<string>();
    test.questions.forEach((question, position) => {
      const q = (...path: (string | number)[]) =>
        at("questions", position, ...path);
      if (keys.has(question.key))
        issues.push({
          path: q("key"),
          message: `Duplicate question key: ${question.key}.`
        });
      keys.add(question.key);
      if (question.kind === "short_text") {
        if (question.options)
          issues.push({
            path: q("options"),
            message: "A short text question has no options."
          });
        if (question.correct.length)
          issues.push({
            path: q("correct"),
            message: "A short text question lists accepted answers instead."
          });
        if (!question.accepted)
          issues.push({
            path: q("accepted"),
            message: "A short text question needs accepted answers."
          });
        return;
      }
      if (question.accepted || question.caseSensitive !== undefined)
        issues.push({
          path: q("accepted"),
          message: "Only a short text question has accepted answers."
        });
      if (
        (question.kind === "code_output" || question.kind === "find_bug") &&
        !question.code
      )
        issues.push({
          path: q("code"),
          message: "This question kind shows a code block."
        });
      if (!question.options) {
        issues.push({
          path: q("options"),
          message: "This question kind needs options."
        });
        return;
      }
      const options = new Set<string>();
      question.options.forEach((option, optionIndex) => {
        if (options.has(option.id))
          issues.push({
            path: q("options", optionIndex, "id"),
            message: `Duplicate option id: ${option.id}.`
          });
        options.add(option.id);
      });
      const single = question.kind !== "multiple_choice";
      if (single ? question.correct.length !== 1 : !question.correct.length)
        issues.push({
          path: q("correct"),
          message: single
            ? "Exactly one option is correct."
            : "At least one option is correct."
        });
      if (new Set(question.correct).size !== question.correct.length)
        issues.push({ path: q("correct"), message: "Duplicate correct id." });
      question.correct.forEach((id, correctIndex) => {
        if (!options.has(id))
          issues.push({
            path: q("correct", correctIndex),
            message: "Correct option must exist in options."
          });
      });
    });
  });
  return issues;
}

/** Short text comparison: NFC, trimmed, case-insensitive unless the question says otherwise. */
export function normalizeShortAnswer(value: string, caseSensitive: boolean) {
  const normalized = value.normalize("NFC").trim();
  return caseSensitive ? normalized : normalized.toLocaleLowerCase("ru-RU");
}

/** Whether a learner's answer is correct; the server's only grading rule for `skill_test@1`. */
export function isSkillTestAnswerCorrect(
  question: SkillTestQuestion,
  answer: SkillTestAnswer
): boolean {
  if (question.kind === "short_text") {
    if (!("text" in answer)) return false;
    const caseSensitive = question.caseSensitive === true;
    const given = normalizeShortAnswer(answer.text, caseSensitive);
    return (question.accepted ?? []).some(
      (accepted) => normalizeShortAnswer(accepted, caseSensitive) === given
    );
  }
  if (!("optionIds" in answer)) return false;
  const chosen = new Set(answer.optionIds);
  return (
    chosen.size === question.correct.length &&
    question.correct.every((id) => chosen.has(id))
  );
}

// --- HTTP: start, submit, results -------------------------------------------------------------

export const startSkillTestRequestSchema = z
  .object({ drawKey: uuidSchema })
  .strict();

export const skillTestScopeSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("skill"), skillKey: resourceSlugSchema }).strict(),
  z.object({ type: z.literal("branch"), branchId: resourceSlugSchema }).strict()
]);

/** What a learner sees of a question: never the answers or explanations. */
export const skillTestQuestionPresentationSchema = z
  .object({
    skillKey: resourceSlugSchema,
    key,
    kind: skillTestQuestionKindSchema,
    prompt: text2000,
    code: skillTestCodeSchema.optional(),
    options: z
      .array(z.object({ id: key, text: text2000 }).strict())
      .min(2)
      .max(8)
      .optional()
  })
  .strict();

export const skillTestDrawSchema = z
  .object({
    drawKey: uuidSchema,
    scope: skillTestScopeSchema,
    threshold: z.number().int().min(1),
    questions: z.array(skillTestQuestionPresentationSchema).min(1).max(200)
  })
  .strict();

const answerTarget = { skillKey: resourceSlugSchema, key };
export const skillTestAnswerSchema = z.union([
  z
    .object({
      ...answerTarget,
      optionIds: z
        .array(key)
        .max(8)
        .refine(
          (ids) => new Set(ids).size === ids.length,
          "Selections must be unique."
        )
    })
    .strict(),
  z
    .object({
      ...answerTarget,
      text: z
        .string()
        .min(1)
        .max(2000)
        .refine((text) => text.trim().length > 0, "An answer is required.")
    })
    .strict()
]);

export const submitSkillTestRequestSchema = z
  .object({ answers: z.array(skillTestAnswerSchema).min(1).max(200) })
  .strict();

export const skillTestResultSchema = z
  .object({
    drawKey: uuidSchema,
    scope: skillTestScopeSchema,
    outcome: z.enum(["passed", "failed"]),
    correctCount: z.number().int().min(0),
    total: z.number().int().min(1),
    threshold: z.number().int().min(1),
    /** When a failed test may be retaken; null after a pass. */
    retryAfter: z.iso.datetime().nullable(),
    questions: z
      .array(
        z
          .object({
            skillKey: resourceSlugSchema,
            key,
            correct: z.boolean(),
            explanation: text2000,
            /** Explanations of the options the learner chose. */
            chosen: z
              .array(z.object({ id: key, explanation: text2000 }).strict())
              .max(8)
          })
          .strict()
      )
      .min(1)
      .max(200)
  })
  .strict();

/** `409 retake_cooldown`: the body of a refused start or submission. */
export const skillTestCooldownSchema = z
  .object({
    code: z.literal("retake_cooldown"),
    message: z.string(),
    retryAfter: z.iso.datetime()
  });

/** Skills the caller can take a test of now (an own active Enrollment has the bank). */
export const ownSkillTestsSchema = z
  .object({ skillKeys: z.array(resourceSlugSchema).max(2000) })
  .strict();

export type StartSkillTestRequest = z.infer<typeof startSkillTestRequestSchema>;
export type SkillTestScope = z.infer<typeof skillTestScopeSchema>;
export type SkillTestQuestionPresentation = z.infer<
  typeof skillTestQuestionPresentationSchema
>;
export type SkillTestDraw = z.infer<typeof skillTestDrawSchema>;
export type SkillTestAnswer = z.infer<typeof skillTestAnswerSchema>;
export type SubmitSkillTestRequest = z.infer<
  typeof submitSkillTestRequestSchema
>;
export type SkillTestResult = z.infer<typeof skillTestResultSchema>;
export type OwnSkillTests = z.infer<typeof ownSkillTestsSchema>;
