import {
  publicLearningCatalogSchema,
  publicLearningCourseSchema,
  publicLearningLessonSchema,
  type PublicLearningCourse
} from "@platform/contracts";
import { notFound } from "next/navigation";
import { serverApiUrl } from "./server-api";

async function read(path: string) {
  const response = await fetch(serverApiUrl(path), {
    cache: "no-store",
    signal: AbortSignal.timeout(10000)
  });
  if (response.status === 404) notFound();
  if (!response.ok)
    throw new Error("Public learning is temporarily unavailable.");
  return response.json();
}
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
export async function loadLearningCatalog() {
  return publicLearningCatalogSchema.parse(await read("/v1/public/learning"));
}
export async function loadLearningCourse(
  organizationSlug: string,
  offeringSlug: string
) {
  return publicLearningCourseSchema.parse(
    await read(
      `/v1/public/learning/${encodeURIComponent(organizationSlug)}/${encodeURIComponent(offeringSlug)}`
    )
  );
}
export async function loadLearningLesson(
  organizationSlug: string,
  offeringSlug: string,
  lessonSlug: string
) {
  return publicLearningLessonSchema.parse(
    await read(
      `/v1/public/learning/${encodeURIComponent(organizationSlug)}/${encodeURIComponent(offeringSlug)}/lessons/${encodeURIComponent(lessonSlug)}`
    )
  );
}
