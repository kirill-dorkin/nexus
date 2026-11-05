import {
  applyCourseManifestRequestSchemaWith,
  courseManifestV1SchemaWith,
  SKILL_TEST,
  type CourseManifestOptions
} from "@platform/contracts";

/**
 * ADR-0075: a skill bank needs 12 questions. The e2e fixture publishes a smaller
 * bank through `SKILL_TEST_MIN_QUESTIONS`; Vercel deployments ignore it.
 */
export function manifestOptions(
  env: NodeJS.ProcessEnv = process.env
): CourseManifestOptions {
  const raw = env.SKILL_TEST_MIN_QUESTIONS?.trim();
  if (!raw || env.VERCEL === "1") return {};
  const value = Number(raw);
  return Number.isInteger(value) &&
    value >= SKILL_TEST.size &&
    value < SKILL_TEST.minQuestionsPerSkill
    ? { minQuestionsPerSkill: value }
    : {};
}

export const manifestSchema = (env: NodeJS.ProcessEnv = process.env) =>
  courseManifestV1SchemaWith(manifestOptions(env));

export const applyManifestSchema = (env: NodeJS.ProcessEnv = process.env) =>
  applyCourseManifestRequestSchemaWith(manifestOptions(env));
