import { brand } from "@platform/brand";

type PublicLessonVideo = {
  videoId: string;
  title: string;
  source: string;
};

/**
 * Reviewed Web-owned supplements for explicit Preview addresses.
 * These do not become canonical course blocks or affect learner progress.
 */
export function getPublicLessonVideo(
  organizationSlug: string,
  offeringSlug: string,
  lessonSlug: string
): PublicLessonVideo | null {
  if (
    organizationSlug === `${brand.slug}-preview` &&
    offeringSlug === "computer-literacy-course" &&
    lessonSlug === "computer"
  ) {
    return {
      videoId: "mLgTnkw558w",
      title: "Основные части компьютера",
      source: "LearnFree"
    };
  }

  return null;
}
