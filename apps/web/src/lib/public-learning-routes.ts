import { brand } from "@platform/brand";
import type { PublicLearningCourse } from "@platform/contracts";

/**
 * The organization that owns this site's own catalog. Its courses get short canonical addresses
 * (`/courses/{course}`) keyed by the stable course slug, which survives new course versions and
 * Offerings. Other organizations keep the Offering address `/learn/{organization}/{offering}`.
 */
export const HOME_ORGANIZATION_SLUG =
  process.env.NEXT_PUBLIC_HOME_ORGANIZATION_SLUG || brand.slug;

export type CourseAddress = {
  organization: Pick<PublicLearningCourse["organization"], "slug">;
  offering: Pick<PublicLearningCourse["offering"], "slug">;
  course: Pick<PublicLearningCourse["course"], "slug">;
};

/** Pure route helpers shared by server pages and client components. */
export function courseUrl(course: CourseAddress) {
  if (course.organization.slug === HOME_ORGANIZATION_SLUG)
    return `/courses/${encodeURIComponent(course.course.slug)}`;
  return `/learn/${encodeURIComponent(course.organization.slug)}/${encodeURIComponent(course.offering.slug)}`;
}

export function lessonUrl(course: CourseAddress, lessonSlug: string) {
  return `${courseUrl(course)}/${encodeURIComponent(lessonSlug)}`;
}

/** Plain-value form for client components that receive the address as props. */
export function courseAddress(course: CourseAddress): CourseAddress {
  return {
    organization: { slug: course.organization.slug },
    offering: { slug: course.offering.slug },
    course: { slug: course.course.slug }
  };
}

/**
 * The name shown for an organization. The home organization is this site itself, so it carries
 * the brand name whatever display name its database row was created with.
 */
export function organizationName(organization: { slug: string; name: string }) {
  return organization.slug === HOME_ORGANIZATION_SLUG
    ? brand.name
    : organization.name;
}
