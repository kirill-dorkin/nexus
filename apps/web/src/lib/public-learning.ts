import {
  publicLearningCatalogSchema,
  publicLearningCourseSchema,
  publicLearningLessonSchema
} from "@platform/contracts";
import { notFound } from "next/navigation";
import { cache } from "react";
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
  return publicLearningCatalogSchema.parse(await read("/v1/public/learning"));
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
