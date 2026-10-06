import { z } from "zod";
import { uuidSchema } from "./common";

const optionId = z
  .string()
  .min(1)
  .max(63)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
export const quizAnswerSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("quiz.single_choice"), optionId }).strict(),
  z
    .object({
      type: z.literal("quiz.multiple_choice"),
      optionIds: z
        .array(optionId)
        .min(1)
        .max(50)
        .refine(
          (ids) => new Set(ids).size === ids.length,
          "Selections must be unique."
        )
    })
    .strict(),
  z
    .object({
      type: z.literal("quiz.short_text"),
      text: z
        .string()
        .min(1)
        .max(2000)
        .refine((text) => text.trim().length > 0, "An answer is required.")
    })
    .strict()
]);
export const checkQuizRequestSchema = z
  .object({ attemptKey: uuidSchema, answer: quizAnswerSchema })
  .strict();
export const quizCheckResultSchema = z
  .object({
    attemptNumber: z.number().int().positive(),
    outcome: z.enum(["passed", "failed"]),
    score: z.union([z.literal(0), z.literal(1)]),
    feedback: z.string().min(1).max(500)
  })
  .strict();
export type QuizAnswer = z.infer<typeof quizAnswerSchema>;
export type CheckQuizRequest = z.infer<typeof checkQuizRequestSchema>;
export type QuizCheckResult = z.infer<typeof quizCheckResultSchema>;
