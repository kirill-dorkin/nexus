import Link from "next/link";
import { LearningShell } from "../components/learning/learning-shell";
import { CourseList } from "../components/learning/course-list";
import { loadLearningCatalog } from "../lib/public-learning";
import styles from "../components/learning/learning.module.css";
export const dynamic = "force-dynamic";
export default async function HomePage() {
  const catalog = await loadLearningCatalog();
  return (
    <LearningShell>
      <header className={styles.hero}>
        <p className={styles.eyebrow}>От любопытства к пониманию</p>
        <h1>
          Разберитесь в теме.
          <br />
          Примените на практике.
        </h1>
        <p className={styles.lead}>
          Короткие видео, понятные конспекты и задания в одном месте. Начните
          бесплатно и учитесь в удобном для вас темпе.
        </p>
        <Link className={styles.button} href="#courses">
          Начать обучение
        </Link>
      </header>
      <section
        id="courses"
        className={styles.section}
        aria-labelledby="courses-title"
      >
        <p className={styles.eyebrow}>Можно начать прямо сейчас</p>
        <h2 id="courses-title">Бесплатные курсы</h2>
        <CourseList courses={catalog.courses} />
      </section>
    </LearningShell>
  );
}
