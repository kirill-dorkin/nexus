import type { PublicLearningCourse } from "@platform/contracts";

/** Pure route helpers shared by server pages and client-side previews. */
export function courseUrl(
  course: Pick<PublicLearningCourse, "organization" | "offering">
) {
  return `/learn/${encodeURIComponent(course.organization.slug)}/${encodeURIComponent(course.offering.slug)}`;
}

export function lessonUrl(
  course: Pick<PublicLearningCourse, "organization" | "offering">,
  lessonSlug: string
) {
  return `${courseUrl(course)}/${encodeURIComponent(lessonSlug)}`;
}
