import type { Metadata } from "next";
import {
  CoursePageView,
  courseMetadata
} from "../../../components/learning/course-page";
import {
  loadLearningCourseBySlug,
  loadRouteCatalog
} from "../../../lib/public-learning";
import { HOME_ORGANIZATION_SLUG } from "../../../lib/public-learning-routes";
export const dynamic = "force-dynamic";
type Props = { params: Promise<{ courseSlug: string }> };
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { courseSlug } = await params;
  return courseMetadata(
    await loadLearningCourseBySlug(HOME_ORGANIZATION_SLUG, courseSlug)
  );
}
export default async function CoursePage({ params }: Props) {
  const { courseSlug } = await params;
  const [course, catalog] = await Promise.all([
    loadLearningCourseBySlug(HOME_ORGANIZATION_SLUG, courseSlug),
    loadRouteCatalog()
  ]);
  return <CoursePageView course={course} catalog={catalog} />;
}
