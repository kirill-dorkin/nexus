import type { Metadata } from "next";
import {
  LessonPageView,
  lessonMetadata
} from "../../../../components/learning/lesson-page";
import {
  loadLearningLessonBySlug,
  loadRouteCatalog
} from "../../../../lib/public-learning";
import { HOME_ORGANIZATION_SLUG } from "../../../../lib/public-learning-routes";
export const dynamic = "force-dynamic";
type Props = { params: Promise<{ courseSlug: string; lessonSlug: string }> };
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { courseSlug, lessonSlug } = await params;
  return lessonMetadata(
    await loadLearningLessonBySlug(
      HOME_ORGANIZATION_SLUG,
      courseSlug,
      lessonSlug
    )
  );
}
export default async function LessonPage({ params }: Props) {
  const { courseSlug, lessonSlug } = await params;
  const course = await loadLearningLessonBySlug(
    HOME_ORGANIZATION_SLUG,
    courseSlug,
    lessonSlug
  );
  // Only the last lesson links onward to the next course of the route (ADR-0066).
  const last = course.course.lessons.at(-1)?.slug === course.lesson.slug;
  return (
    <LessonPageView
      course={course}
      catalog={last ? await loadRouteCatalog() : []}
    />
  );
}
