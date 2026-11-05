import { z } from "zod";

import {
  ASSIGNMENT_LIMITS,
  isAssignmentPath,
  matchesAllowedFile
} from "./assignment-rules";

export {
  ASSIGNMENT_LIMITS,
  isAssignmentPath,
  matchesAllowedFile,
  uploadProblems
} from "./assignment-rules";

const assignmentPathSchema = z
  .string()
  .refine(
    isAssignmentPath,
    "A relative path without '..', backslashes or empty parts."
  );

const fileContentSchema = z.string().max(ASSIGNMENT_LIMITS.maxFileBytes);

export const assignmentFilesSchema = z
  .record(assignmentPathSchema, fileContentSchema)
  .refine(
    (files) => Object.keys(files).length <= ASSIGNMENT_LIMITS.maxFiles,
    `At most ${String(ASSIGNMENT_LIMITS.maxFiles)} files.`
  )
  .refine(
    (files) =>
      Object.values(files).reduce(
        (total, content) => total + new TextEncoder().encode(content).length,
        0
      ) <= ASSIGNMENT_LIMITS.maxTotalBytes,
    "At most 512 KB in total."
  );

/** Static checks (ADR-0064 kinds) usable on a file assignment; `label` is what the learner sees. */
export const assignmentCheckSchema = z
  .object({
    label: z.string().trim().min(1).max(200),
    selector: z.string().min(1).max(500).optional(),
    text: z.string().max(500).optional(),
    attr: z.string().min(1).max(100).optional(),
    value: z.string().max(500).optional(),
    count: z.number().int().min(0).max(1000).optional(),
    max: z.number().int().min(0).max(1000).optional(),
    absent: z.boolean().optional(),
    contains: z.string().min(1).max(500).optional(),
    // Same shape as CssCheck in @platform/checks (css-rules).
    css: z
      .object({
        selector: z.string().min(1).max(500),
        property: z.string().min(1).max(100),
        value: z
          .union([z.string().max(200), z.array(z.string().max(200)).max(20)])
          .optional(),
        includes: z.string().max(200).optional(),
        within: z.string().max(200).optional()
      })
      .strict()
      .optional(),
    hint: z.string().max(600).optional()
  })
  .strict()
  .refine(
    (check) =>
      [check.selector, check.contains, check.css].filter((x) => x !== undefined)
        .length === 1,
    "A check has exactly one of selector, contains or css."
  );

/** The learner-visible part of an `assignment.files` activity (manifest `presentation`). */
export const fileAssignmentPresentationSchema = z
  .object({
    lang: z.literal("html"),
    entry: assignmentPathSchema.default("index.html"),
    starterFiles: assignmentFilesSchema,
    allowedFiles: z.array(z.string().min(1).max(200)).min(1).max(50)
  })
  .strict();

/** The protected part (manifest `validation`): never shown to learners. */
export const fileAssignmentValidationSchema = z
  .object({
    checks: z.array(assignmentCheckSchema).min(1).max(100),
    solutionFiles: assignmentFilesSchema
  })
  .strict();

type SpecParts = {
  entry: string;
  allowedFiles: readonly string[];
  starterFiles: Readonly<Record<string, string>>;
  solutionFiles: Readonly<Record<string, string>>;
};

/** Cross-field rules of an assignment; used by the spec and by the manifest activity. */
export function assignmentSpecIssues(
  spec: SpecParts
): { path: (string | number)[]; message: string }[] {
  const issues: { path: (string | number)[]; message: string }[] = [];
  const allowed = (path: string) =>
    spec.allowedFiles.some((pattern) => matchesAllowedFile(path, pattern));
  if (!allowed(spec.entry))
    issues.push({
      path: ["allowedFiles"],
      message: "The entry file must be allowed."
    });
  for (const [key, files] of [
    ["starterFiles", spec.starterFiles],
    ["solutionFiles", spec.solutionFiles]
  ] as const)
    for (const path of Object.keys(files))
      if (!allowed(path))
        issues.push({
          path: [key, path],
          message: "Every file must match allowedFiles."
        });
  if (spec.solutionFiles[spec.entry] === undefined)
    issues.push({
      path: ["solutionFiles"],
      message: "The solution must contain the entry file."
    });
  return issues;
}

/** What an author writes for an `assignment.files` activity (ADR-0073). */
export const fileAssignmentSpecSchema = fileAssignmentPresentationSchema
  .extend(fileAssignmentValidationSchema.shape)
  .strict()
  .superRefine((spec, context) => {
    for (const issue of assignmentSpecIssues(spec))
      context.addIssue({ code: "custom", ...issue });
  });

/** Learner request: the files of one try, under a client-made attempt key. */
export const submitAssignmentRequestSchema = z
  .object({
    attemptKey: z.uuid(),
    files: assignmentFilesSchema
  })
  .strict();

export const assignmentCheckResultSchema = z
  .object({
    attemptNumber: z.number().int().positive(),
    outcome: z.enum(["passed", "failed"]),
    score: z.number().min(0).max(1),
    checks: z
      .array(
        z
          .object({
            label: z.string().min(1).max(200),
            passed: z.boolean(),
            hint: z.string().max(600).optional()
          })
          .strict()
      )
      .max(100)
  })
  .strict();
export type SubmitAssignmentRequest = z.infer<
  typeof submitAssignmentRequestSchema
>;
export type AssignmentCheckResult = z.infer<typeof assignmentCheckResultSchema>;
export type FileAssignmentValidation = z.infer<
  typeof fileAssignmentValidationSchema
>;

export type AssignmentCheck = z.infer<typeof assignmentCheckSchema>;
export type FileAssignmentSpec = z.infer<typeof fileAssignmentSpecSchema>;
export type AssignmentFiles = z.infer<typeof assignmentFilesSchema>;
