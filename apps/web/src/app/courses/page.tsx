import type { Metadata } from "next";
import { LearningShell } from "../../components/learning/learning-shell";
import { CourseList } from "../../components/learning/course-list";
import { loadLearningCatalog } from "../../lib/public-learning";
import styles from "../../components/learning/learning.module.css";
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Бесплатные курсы" };
export default async function CoursesPage() {
  const catalog = await loadLearningCatalog();
  return (
    <LearningShell>
      <header className={styles.hero}>
        <p className={styles.eyebrow}>Каталог</p>
        <h1>Учитесь в своём темпе</h1>
        <p className={styles.lead}>
          Бесплатные курсы с видео, понятными конспектами и заданиями для
          закрепления.
        </p>
      </header>
      <section className={styles.section} aria-label="Доступные курсы">
        <CourseList courses={catalog.courses} />
      </section>
    </LearningShell>
  );
}
