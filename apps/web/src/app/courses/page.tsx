import type { Metadata } from "next";
import { LearningShell } from "../../components/learning/learning-shell";
import { CourseList } from "../../components/learning/course-list";
import { loadLearningCatalog } from "../../lib/public-learning";
import { LearningPageHeading } from "../../components/learning/learning-page-heading";
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Бесплатные курсы" };
export default async function CoursesPage() {
  const catalog = await loadLearningCatalog();
  return (
    <LearningShell>
      <LearningPageHeading
        eyebrow="Каталог"
        title="Учитесь в своём темпе"
        description="Бесплатные курсы с видео, понятными конспектами и заданиями для закрепления."
      />
      <section aria-label="Доступные курсы">
        <CourseList courses={catalog.courses} />
      </section>
    </LearningShell>
  );
}
