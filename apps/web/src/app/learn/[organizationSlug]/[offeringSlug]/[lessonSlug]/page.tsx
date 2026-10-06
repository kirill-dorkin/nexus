import Link from "next/link";
import { LearningShell } from "../../../../../components/learning/learning-shell";
import { LessonBlocks } from "../../../../../components/learning/lesson-blocks";
import {
  courseUrl,
  lessonUrl,
  loadLearningLesson
} from "../../../../../lib/public-learning";
import styles from "../../../../../components/learning/learning.module.css";
export const dynamic = "force-dynamic";
type Props = {
  params: Promise<{
    organizationSlug: string;
    offeringSlug: string;
    lessonSlug: string;
  }>;
};
export default async function LessonPage({ params }: Props) {
  const { organizationSlug, offeringSlug, lessonSlug } = await params;
  const course = await loadLearningLesson(
    organizationSlug,
    offeringSlug,
    lessonSlug
  );
  const index = course.course.lessons.findIndex(
    (lesson) => lesson.slug === course.lesson.slug
  );
  const previous = course.course.lessons[index - 1];
  const next = course.course.lessons[index + 1];
  return (
    <LearningShell>
      <nav className={styles.breadcrumbs} aria-label="Навигационная цепочка">
        <Link href="/courses">Курсы</Link>
        <Link href={courseUrl(course)}>{course.course.title}</Link>
        <span aria-current="page">Урок {index + 1}</span>
      </nav>
      <header className={styles.lessonHeading}>
        <p className={styles.eyebrow}>
          Урок {index + 1} из {course.course.lessons.length} ·{" "}
          {course.lesson.durationMinutes} мин
        </p>
        <h1>{course.lesson.title}</h1>
        <p className={styles.lead}>{course.lesson.summary}</p>
      </header>
      <LessonBlocks lesson={course.lesson} />
      <nav className={styles.lessonNav} aria-label="Переход между уроками">
        {previous ? (
          <Link href={lessonUrl(course, previous.slug)}>
            ← {previous.title}
          </Link>
        ) : (
          <Link href={courseUrl(course)}>← Программа курса</Link>
        )}
        {next ? (
          <Link href={lessonUrl(course, next.slug)}>{next.title} →</Link>
        ) : (
          <Link href={courseUrl(course)}>К программе курса →</Link>
        )}
      </nav>
    </LearningShell>
  );
}
