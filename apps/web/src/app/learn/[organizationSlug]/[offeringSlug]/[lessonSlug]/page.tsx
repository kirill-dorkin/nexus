import { LearnerEntry } from "../../../../../components/learning/learner-entry";
import type { Metadata } from "next";
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
import { absoluteUrl, jsonLd } from "../../../../../lib/site";
export const dynamic = "force-dynamic";
type Props = {
  params: Promise<{
    organizationSlug: string;
    offeringSlug: string;
    lessonSlug: string;
  }>;
};
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { organizationSlug, offeringSlug, lessonSlug } = await params;
  const course = await loadLearningLesson(organizationSlug, offeringSlug, lessonSlug);
  const path = lessonUrl(course, lessonSlug);
  return {
    title: `${course.lesson.title} — ${course.course.title}`,
    description: course.lesson.summary,
    alternates: { canonical: path },
    openGraph: {
      type: "article",
      url: path,
      title: course.lesson.title,
      description: course.lesson.summary
    }
  };
}
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
  const lessonProgress = Math.round(
    ((index + 1) / course.course.lessons.length) * 100
  );
  const path = lessonUrl(course, lessonSlug);
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "LearningResource",
    name: course.lesson.title,
    description: course.lesson.summary,
    url: absoluteUrl(path),
    inLanguage: "ru",
    timeRequired: `PT${course.lesson.durationMinutes}M`,
    isPartOf: {
      "@type": "Course",
      name: course.course.title,
      url: absoluteUrl(courseUrl(course))
    }
  };
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(structuredData) }} />
      <LearningShell>
        <nav className={styles.breadcrumbs} aria-label="Навигационная цепочка">
          <Link href="/courses">Курсы</Link>
          <Link href={courseUrl(course)}>{course.course.title}</Link>
          <span aria-current="page">Урок {index + 1}</span>
        </nav>
        <div className={styles.lessonLayout}>
          <div className={styles.lessonMain}>
            <div className={styles.lessonIntro}>
              <LearningPageHeading
                eyebrow={`Урок ${index + 1} из ${course.course.lessons.length} · ${course.lesson.durationMinutes} мин`}
                title={course.lesson.title}
                description={course.lesson.summary}
              />
              <div
                className={styles.lessonMeter}
                role="progressbar"
                aria-label={`Позиция в программе: урок ${index + 1} из ${course.course.lessons.length}`}
                aria-valuemin={1}
                aria-valuemax={course.course.lessons.length}
                aria-valuenow={index + 1}
              >
                <span style={{ width: `${lessonProgress}%` }} />
              </div>
            </div>
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
                data-next=""
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
            <Surface appearance="quiet" className={styles.lessonOutlineSurface}>
              <Heading level={2} size="small">
                Программа курса
              </Heading>
              <nav aria-label="Уроки курса">
                <LessonOutline course={course} currentSlug={lessonSlug} compact />
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
    </>
  );
}
