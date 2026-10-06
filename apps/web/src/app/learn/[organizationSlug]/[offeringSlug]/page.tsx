import Link from "next/link";
import { LearningShell } from "../../../../components/learning/learning-shell";
import { loadLearningCourse, lessonUrl } from "../../../../lib/public-learning";
import styles from "../../../../components/learning/learning.module.css";
export const dynamic = "force-dynamic";
type Props = {
  params: Promise<{ organizationSlug: string; offeringSlug: string }>;
};
export default async function CoursePage({ params }: Props) {
  const { organizationSlug, offeringSlug } = await params;
  const course = await loadLearningCourse(organizationSlug, offeringSlug);
  const duration = course.course.lessons.reduce(
    (sum, lesson) => sum + lesson.durationMinutes,
    0
  );
  return (
    <LearningShell>
      <nav className={styles.breadcrumbs} aria-label="Навигационная цепочка">
        <Link href="/courses">Все курсы</Link>
        <span aria-current="page">{course.course.title}</span>
      </nav>
      <header className={styles.hero}>
        <p className={styles.eyebrow}>{course.organization.name} · Бесплатно</p>
        <h1>{course.course.title}</h1>
        <p className={styles.lead}>{course.course.description}</p>
      </header>
      <div className={styles.courseLayout}>
        <section aria-labelledby="lessons-title">
          <h2 id="lessons-title">Программа курса</h2>
          <ol className={styles.lessons}>
            {course.course.lessons.map((lesson, index) => (
              <li key={lesson.slug}>
                <Link
                  className={styles.lessonLink}
                  href={lessonUrl(course, lesson.slug)}
                >
                  <span className={styles.number}>
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <div>
                    <strong>{lesson.title}</strong>
                    <p>{lesson.summary}</p>
                  </div>
                  <span className={styles.minutes}>
                    {lesson.durationMinutes} мин
                  </span>
                </Link>
              </li>
            ))}
          </ol>
        </section>
        <aside className={styles.aside} aria-label="Начать курс">
          <h2>В удобном ритме</h2>
          <p className={styles.muted}>
            {course.course.lessons.length} уроков · около {duration} мин
          </p>
          <p>
            Смотрите видео, читайте конспекты и возвращайтесь к нужным темам.
          </p>
          <Link
            className={styles.button}
            href={lessonUrl(course, course.course.lessons[0]!.slug)}
          >
            Начать обучение
          </Link>
        </aside>
      </div>
    </LearningShell>
  );
}
