// Light helpers for the browser (spec WP-6): no schemas, so any page may
// import them without loading a validator. browser.test.ts keeps them equal to
// the full contracts.
export {
  ASSIGNMENT_LIMITS,
  isAssignmentPath,
  matchesAllowedFile,
  uploadProblems
} from "./assignment-rules";

const UUID =
  /^(?:[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$/i;
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Same answer as `uuidSchema.safeParse(value).success`. */
export const isUuid = (value: unknown): boolean =>
  typeof value === "string" && UUID.test(value);

/** Same answer as `resourceSlugSchema.safeParse(value).success`. */
export const isResourceSlug = (value: unknown): boolean =>
  typeof value === "string" &&
  value.length >= 2 &&
  value.length <= 63 &&
  SLUG.test(value);

/**
 * zod must not probe `new Function` in the browser: the Content Security
 * Policy (ADR-0069) reports the probe as a violation even though zod catches it.
 */
export function parseWithoutEvalInBrowser(): void {
  if (typeof window === "undefined") return;
  // zod keeps its settings on this global and reuses an existing object, so
  // this works before or after zod loads and costs no zod code on pages that
  // never parse (browser.test.ts proves zod sees it).
  const holder = globalThis as { __zod_globalConfig?: { jitless?: boolean } };
  (holder.__zod_globalConfig ??= {}).jitless = true;
}
