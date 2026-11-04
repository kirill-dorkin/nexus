import { isResourceSlug, isUuid } from "@platform/contracts/browser";
/** A URL locator is never authority; only exact local learning/Studio paths are accepted. */
export function safeLearningReturnTo(value: unknown): string {
  if (value === "/studio") return value;
  if (
    typeof value === "string" &&
    /^\/studio\/[^/]+\/(?:new|[^/]+)$/.test(value)
  ) {
    const [, , org, course] = value.split("/");
    if (isUuid(org) && (course === "new" || isUuid(course))) return value;
  }
  if (value === "/me/learning") return value;
  if (typeof value !== "string" || value.length > 220) return "/me/learning";
  // Stable course addresses (ADR-0061): /courses/{course} and /courses/{course}/{lesson}.
  // Optional groups that did not match are undefined at runtime,
  // although RegExpExecArray types every group as a string.
  const course = /^\/courses\/([^/]+)(?:\/([^/]+))?$/.exec(value);
  if (course)
    return (course.slice(1) as (string | undefined)[])
      .filter((v) => v !== undefined)
      .every((v) => isResourceSlug(v))
      ? value
      : "/me/learning";
  const match = /^\/learn\/([^/]+)\/([^/]+)(?:\/([^/]+))?$/.exec(value);
  if (
    !(match?.slice(1) as (string | undefined)[] | undefined)
      ?.filter((v) => v !== undefined)
      .every((v) => isResourceSlug(v))
  )
    return "/me/learning";
  return value;
}
export function learningLoginUrl(returnTo: string): string {
  return `/login?returnTo=${encodeURIComponent(safeLearningReturnTo(returnTo))}`;
}
