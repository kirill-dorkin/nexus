import type { Metadata } from "next";
import { permanentRedirect } from "next/navigation";
import { CoursePageView, courseMetadata } from "../../../../components/learning/course-page";
import { loadLearningCourse } from "../../../../lib/public-learning";
import { courseUrl } from "../../../../lib/public-learning-routes";
export const dynamic = "force-dynamic";
type Props = {
  params: Promise<{ organizationSlug: string; offeringSlug: string }>;
};
async function load({ params }: Props) {
  const { organizationSlug, offeringSlug } = await params;
  const course = await loadLearningCourse(organizationSlug, offeringSlug);
  // Courses with a stable address live there; this Offering address forwards permanently.
  const canonical = courseUrl(course);
  if (!canonical.startsWith("/learn/")) permanentRedirect(canonical);
  return course;
}
export async function generateMetadata(props: Props): Promise<Metadata> {
  return courseMetadata(await load(props));
}
export default async function CoursePage(props: Props) {
  return <CoursePageView course={await load(props)} />;
}
