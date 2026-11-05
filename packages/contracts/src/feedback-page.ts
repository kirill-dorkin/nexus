// Page context of a feedback report (ADR-0083). Plain data without zod, so
// the API and Web share it. The API stores only what this returns, never the
// pathname itself.

/** Route templates a report can be about; anything else is "other". */
export const FEEDBACK_ROUTES = [
  "/",
  "/blog",
  "/blog/[slug]",
  "/characters",
  "/characters/[character]",
  "/courses",
  "/courses/[course]",
  "/courses/[course]/[lesson]",
  "/learn/[organization]/[offering]",
  "/learn/[organization]/[offering]/[lesson]",
  "/map",
  "/me/learning",
  "other"
] as const;

export type FeedbackRoute = (typeof FEEDBACK_ROUTES)[number];

export type FeedbackPageContext = Readonly<{
  route: FeedbackRoute;
  courseSlug: string | null;
  lessonSlug: string | null;
}>;

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const isSlug = (value: string | undefined): value is string =>
  value !== undefined &&
  value.length >= 2 &&
  value.length <= 63 &&
  SLUG.test(value);

const other: FeedbackPageContext = {
  route: "other",
  courseSlug: null,
  lessonSlug: null
};

const page = (
  route: FeedbackRoute,
  courseSlug: string | null = null,
  lessonSlug: string | null = null
): FeedbackPageContext => ({ route, courseSlug, lessonSlug });

/**
 * The route template and slugs of a pathname. Segments that are not slugs
 * make the page "other", so nothing free-form is ever kept.
 */
export function feedbackPageContext(pathname: string): FeedbackPageContext {
  if (!pathname.startsWith("/") || /[?#]/.test(pathname)) return other;
  const parts = pathname.split("/").filter((part) => part.length > 0);
  if (!parts.every(isSlug)) return other;
  const [first, second, third, fourth] = parts;
  switch (parts.length) {
    case 0:
      return page("/");
    case 1:
      if (first === "blog") return page("/blog");
      if (first === "characters") return page("/characters");
      if (first === "courses") return page("/courses");
      if (first === "map") return page("/map");
      return other;
    case 2:
      if (first === "blog") return page("/blog/[slug]");
      if (first === "characters") return page("/characters/[character]");
      if (first === "courses") return page("/courses/[course]", second);
      if (first === "me" && second === "learning") return page("/me/learning");
      return other;
    case 3:
      if (first === "courses")
        return page("/courses/[course]/[lesson]", second, third);
      if (first === "learn") return page("/learn/[organization]/[offering]");
      return other;
    case 4:
      if (first === "learn")
        return page(
          "/learn/[organization]/[offering]/[lesson]",
          null,
          fourth ?? null
        );
      return other;
    default:
      return other;
  }
}
