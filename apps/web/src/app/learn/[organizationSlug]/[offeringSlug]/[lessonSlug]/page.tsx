import type { Metadata } from "next";
import { permanentRedirect } from "next/navigation";
import {
  LessonPageView,
  lessonMetadata
} from "../../../../../components/learning/lesson-page";
import { loadLearningLesson } from "../../../../../lib/public-learning";
import { lessonUrl } from "../../../../../lib/public-learning-routes";
export const dynamic = "force-dynamic";
type Props = {
  params: Promise<{
    organizationSlug: string;
    offeringSlug: string;
    lessonSlug: string;
  }>;
};
async function load({ params }: Props) {
  const { organizationSlug, offeringSlug, lessonSlug } = await params;
  const course = await loadLearningLesson(
    organizationSlug,
    offeringSlug,
    lessonSlug
  );
  const canonical = lessonUrl(course, course.lesson.slug);
  if (!canonical.startsWith("/learn/")) permanentRedirect(canonical);
  return course;
}
export async function generateMetadata(props: Props): Promise<Metadata> {
  return lessonMetadata(await load(props));
}
export default async function LessonPage(props: Props) {
  return <LessonPageView course={await load(props)} />;
}
