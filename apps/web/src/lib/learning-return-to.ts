import { resourceSlugSchema } from "@platform/contracts";
/** A URL locator is never authority; only exact local learning paths are accepted. */
export function safeLearningReturnTo(value: unknown): string {
  if (value === "/me/learning") return value;
  if (typeof value !== "string" || value.length > 220) return "/me/learning";
  const match = /^\/learn\/([^/]+)\/([^/]+)(?:\/([^/]+))?$/.exec(value);
  if (
    !match ||
    !match
      .slice(1)
      .filter((v) => v !== undefined)
      .every((v) => resourceSlugSchema.safeParse(v).success)
  )
    return "/me/learning";
  return value;
}
export function learningLoginUrl(returnTo: string): string {
  return `/login?returnTo=${encodeURIComponent(safeLearningReturnTo(returnTo))}`;
}
