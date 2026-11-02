import {
  publicLearningCatalogSchema,
  publicLearningCourseSchema,
  publicLearningLessonSchema
} from "@platform/contracts";
import { notFound } from "next/navigation";
import { cache } from "react";
import { orderByRoute } from "./learning-route";
import { serverApiUrl } from "./server-api";
export { courseUrl, lessonUrl } from "./public-learning-routes";

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
export const loadLearningCatalog = cache(async function loadLearningCatalog() {
  const catalog = publicLearningCatalogSchema.parse(await read("/v1/public/learning"));
  return { ...catalog, courses: orderByRoute(catalog.courses) };
});
export const loadLearningCourse = cache(async function loadLearningCourse(
  organizationSlug: string,
  offeringSlug: string
) {
  return publicLearningCourseSchema.parse(
    await read(
      `/v1/public/learning/${encodeURIComponent(organizationSlug)}/${encodeURIComponent(offeringSlug)}`
    )
  );
});
export const loadLearningLesson = cache(async function loadLearningLesson(
  organizationSlug: string,
  offeringSlug: string,
  lessonSlug: string
) {
  return publicLearningLessonSchema.parse(
    await read(
      `/v1/public/learning/${encodeURIComponent(organizationSlug)}/${encodeURIComponent(offeringSlug)}/lessons/${encodeURIComponent(lessonSlug)}`
    )
  );
});
/** Stable course address: the API resolves whichever Offering serves the course right now. */
export const loadLearningCourseBySlug = cache(async function loadLearningCourseBySlug(
  organizationSlug: string,
  courseSlug: string
) {
  return publicLearningCourseSchema.parse(
    await read(
      `/v1/public/learning/${encodeURIComponent(organizationSlug)}/courses/${encodeURIComponent(courseSlug)}`
    )
  );
});
export const loadLearningLessonBySlug = cache(async function loadLearningLessonBySlug(
  organizationSlug: string,
  courseSlug: string,
  lessonSlug: string
) {
  return publicLearningLessonSchema.parse(
    await read(
      `/v1/public/learning/${encodeURIComponent(organizationSlug)}/courses/${encodeURIComponent(courseSlug)}/lessons/${encodeURIComponent(lessonSlug)}`
    )
  );
});
/** The catalog for route navigation (ADR-0066). A failed read only hides the route, never the page. */
export async function loadRouteCatalog() {
  try {
    return (await loadLearningCatalog()).courses;
  } catch {
    return [];
  }
}
