import { LearnerEntry } from "../../../../../components/learning/learner-entry";
import Link from "next/link";
import { LearningShell } from "../../../../../components/learning/learning-shell";
import { LessonBlocks } from "../../../../../components/learning/lesson-blocks";
import {
  courseUrl,
  lessonUrl,
  loadLearningLesson
} from "../../../../../lib/public-learning";
import { Heading, Surface } from "@platform/ui";
import { LearningPageHeading } from "../../../../../components/learning/learning-page-heading";
import { LessonOutline } from "../../../../../components/learning/lesson-outline";
import styles from "../../../../../components/learning/flow.module.css";
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
      <LearningPageHeading
        eyebrow={`Урок ${index + 1} из ${course.course.lessons.length} · ${course.lesson.durationMinutes} мин`}
        title={course.lesson.title}
        description={course.lesson.summary}
      />
      <div className={styles.lessonLayout}>
        <div className={styles.lessonMain}>
          <LessonBlocks
            lesson={course.lesson}
            organizationSlug={organizationSlug}
            offeringSlug={offeringSlug}
          />
          <nav className={styles.lessonNav} aria-label="Переход между уроками">
            <Link
              href={
                previous ? lessonUrl(course, previous.slug) : courseUrl(course)
              }
            >
              <span>← {previous ? "Предыдущий урок" : "Назад к курсу"}</span>
              <strong>{previous?.title ?? "Программа курса"}</strong>
            </Link>
            <Link
              href={next ? lessonUrl(course, next.slug) : courseUrl(course)}
            >
              <span>{next ? "Следующий урок" : "Вернуться к курсу"} →</span>
              <strong>{next?.title ?? "К программе курса"}</strong>
            </Link>
          </nav>
        </div>
        <aside
          className={styles.lessonAside}
          aria-label="Программа и сохранённое обучение"
        >
          <Surface appearance="quiet">
            <Heading level={2} size="card">
              Программа курса
            </Heading>
            <nav aria-label="Уроки курса">
              <LessonOutline course={course} currentSlug={lessonSlug} />
            </nav>
          </Surface>
          <LearnerEntry
            organizationSlug={organizationSlug}
            offeringSlug={offeringSlug}
            lessonSlug={lessonSlug}
          />
        </aside>
      </div>
    </LearningShell>
  );
}
