import { LearnerEntry } from "./learner-entry";
import { FeedbackLauncher } from "../feedback/feedback-launcher";
import feedbackStyles from "../feedback/feedback.module.css";
import { LessonAnalytics } from "../../lib/analytics/lesson-analytics";
import type { Metadata } from "next";
import Link from "next/link";
import { LearningShell } from "./learning-shell";
import { LessonBlocks } from "./lesson-blocks";
import type {
  PublicLearningCourse,
  PublicLearningLesson
} from "@platform/contracts";
import { routePosition } from "../../lib/learning-route";
import { courseUrl, lessonUrl } from "../../lib/public-learning-routes";
import { LearningPageHeading } from "./learning-page-heading";
import { CourseNavigator } from "./course-navigator";
import { LessonOrderHint } from "./lesson-order-hint";
import { SignupNudge } from "./signup-nudge";
import styles from "./flow.module.css";
import { absoluteUrl, jsonLd } from "../../lib/site";
export function lessonMetadata(course: PublicLearningLesson): Metadata {
  const path = lessonUrl(course, course.lesson.slug);
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
export function LessonPageView({
  course,
  catalog = []
}: {
  course: PublicLearningLesson;
  catalog?: readonly PublicLearningCourse[];
}) {
  const lessonSlug = course.lesson.slug;
  const index = course.course.lessons.findIndex(
    (lesson) => lesson.slug === course.lesson.slug
  );
  const previous = course.course.lessons[index - 1];
  const next = course.course.lessons[index + 1];
  // The last lesson continues the route with the next course instead of a dead end (ADR-0066).
  const nextCourse = next
    ? null
    : (routePosition(course, catalog)?.next?.course ?? null);
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
      <LessonAnalytics
        organizationSlug={course.organization.slug}
        offeringSlug={course.offering.slug}
        lessonSlug={lessonSlug}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd(structuredData) }}
      />
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
            <LessonOrderHint
              organizationSlug={course.organization.slug}
              offeringSlug={course.offering.slug}
              lessons={course.course.lessons}
              current={lessonSlug}
              hrefFor={Object.fromEntries(
                course.course.lessons.map((l) => [
                  l.slug,
                  lessonUrl(course, l.slug)
                ])
              )}
            />
            <LessonBlocks
              lesson={course.lesson}
              organizationSlug={course.organization.slug}
              offeringSlug={course.offering.slug}
              courseSlug={course.course.slug}
            />
            <nav
              className={styles.lessonNav}
              aria-label="Переход между уроками"
            >
              <Link
                href={
                  previous
                    ? lessonUrl(course, previous.slug)
                    : courseUrl(course)
                }
              >
                <span>← {previous ? "Предыдущий урок" : "Назад к курсу"}</span>
                <strong>{previous?.title ?? "Программа курса"}</strong>
              </Link>
              {next ? (
                <Link data-next="" href={lessonUrl(course, next.slug)}>
                  <span>Следующий урок →</span>
                  <strong>{next.title}</strong>
                </Link>
              ) : nextCourse ? (
                <Link data-next="" href={courseUrl(nextCourse)}>
                  <span>Следующий курс маршрута →</span>
                  <strong>{nextCourse.course.title}</strong>
                </Link>
              ) : (
                <Link data-next="" href={courseUrl(course)}>
                  <span>Вернуться к курсу →</span>
                  <strong>К программе курса</strong>
                </Link>
              )}
            </nav>
            <div className={feedbackStyles.lessonFooter}>
              <p>Что-то непонятно или не работает в этом уроке?</p>
              <FeedbackLauncher label="Сообщить" />
            </div>
          </div>
          <aside
            className={styles.lessonAside}
            aria-label="Программа и сохранённое обучение"
          >
            <CourseNavigator
              organizationSlug={course.organization.slug}
              offeringSlug={course.offering.slug}
              courseSlug={course.course.slug}
              current={lessonSlug}
              items={course.course.lessons.map((lesson) => ({
                slug: lesson.slug,
                title: lesson.title,
                chapter: lesson.chapter ?? null,
                minutes: lesson.durationMinutes,
                href: lessonUrl(course, lesson.slug)
              }))}
            />
            <LearnerEntry
              organizationSlug={course.organization.slug}
              offeringSlug={course.offering.slug}
              courseSlug={course.course.slug}
              lessonSlug={lessonSlug}
            />
          </aside>
        </div>
        <SignupNudge returnTo={path} />
      </LearningShell>
    </>
  );
}
