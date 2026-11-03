import { resourceSlugSchema, uuidSchema } from "@platform/contracts";

export function safeOAuthReturnTo(value: unknown): string {
  if (value === "/studio" || value === "/me/learning") return value;
  if (typeof value !== "string" || value.length > 220) return "/me/learning";

  const studio = /^\/studio\/([^/]+)\/(new|[^/]+)$/.exec(value);
  if (
    studio !== null &&
    uuidSchema.safeParse(studio[1]).success &&
    (studio[2] === "new" || uuidSchema.safeParse(studio[2]).success)
  ) return value;

  // Optional groups that did not match are undefined at runtime,
  // although RegExpExecArray types every group as a string.
  const learning = /^\/learn\/([^/]+)\/([^/]+)(?:\/([^/]+))?$/.exec(value);
  if (
    learning !== null &&
    (learning.slice(1) as (string | undefined)[]).filter((item) => item !== undefined)
      .every((item) => resourceSlugSchema.safeParse(item).success)
  ) return value;

  // Stable course addresses (ADR-0061): /courses/{course} and /courses/{course}/{lesson}.
  const course = /^\/courses\/([^/]+)(?:\/([^/]+))?$/.exec(value);
  if (
    course !== null &&
    (course.slice(1) as (string | undefined)[]).filter((item) => item !== undefined)
      .every((item) => resourceSlugSchema.safeParse(item).success)
  ) return value;

  return "/me/learning";
}
