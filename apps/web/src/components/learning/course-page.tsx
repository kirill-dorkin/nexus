import { itemAt } from "../../lib/item-at";
import { LearnerEntry } from "./learner-entry";
import type { Metadata } from "next";
import { brand } from "@platform/brand";
import Link from "next/link";
import { LearningShell } from "./learning-shell";
import type { PublicLearningCourse } from "@platform/contracts";
import { courseUrl, lessonUrl } from "../../lib/public-learning-routes";
import { Heading, Text, buttonClass } from "@platform/ui";
import { ArrowRightIcon } from "@phosphor-icons/react/dist/ssr";
import { LearningPageHeading } from "./learning-page-heading";
import { LessonOutline } from "./lesson-outline";
import { LearningRouteCard } from "./learning-route-card";
import { durationLabel, lessonCount } from "./learning-labels";
import styles from "./flow.module.css";
import { absoluteUrl, jsonLd } from "../../lib/site";
export function courseMetadata(course: PublicLearningCourse): Metadata {
  const path = courseUrl(course);
  return {
    title: course.course.title,
    description: course.course.description,
    alternates: { canonical: path },
    openGraph: {
      type: "website",
      url: path,
      title: `${course.course.title} · ${brand.name}`,
      description: course.course.description
    }
  };
}
export function CoursePageView({
  course,
  catalog = []
}: {
  course: PublicLearningCourse;
  catalog?: readonly PublicLearningCourse[];
}) {
  const duration = course.course.lessons.reduce(
    (sum, lesson) => sum + lesson.durationMinutes,
    0
  );
  const path = courseUrl(course);
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Course",
    name: course.course.title,
    description: course.course.description,
    url: absoluteUrl(path),
    inLanguage: "ru",
    provider: {
      "@type": "Organization",
      name: course.organization.name
    },
    hasCourseInstance: {
      "@type": "CourseInstance",
      courseMode: "online",
      courseWorkload: `PT${duration}M`
    }
  };
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd(structuredData) }}
      />
      <LearningShell>
        <nav className={styles.breadcrumbs} aria-label="Навигационная цепочка">
          <Link href="/courses">Все курсы</Link>
          <span aria-current="page">{course.course.title}</span>
        </nav>
        <div className={styles.courseLayout}>
          <div className={styles.courseHeroCopy}>
            <LearningPageHeading
              eyebrow={course.organization.name}
              title={course.course.title}
              description={course.course.description}
            >
              <ul className={styles.metaPills} aria-label="Формат курса">
                <li data-accent="">Бесплатно</li>
                <li>{lessonCount(course.course.lessons.length)}</li>
                <li>{durationLabel(duration)}</li>
                <li>В своём темпе</li>
              </ul>
            </LearningPageHeading>
            <LearningRouteCard course={course} catalog={catalog} />
          </div>
          <aside className={styles.aside} aria-label="Начать курс">
            <section className={styles.courseStart}>
              <p className={styles.startKicker}>Можно без регистрации</p>
              <Heading level={2} size="card">
                Начните с первого урока
              </Heading>
              <Text muted size="sm">
                {itemAt(course.course.lessons, 0).title} ·{" "}
                {itemAt(course.course.lessons, 0).durationMinutes} мин
              </Text>
              <Link
                className={buttonClass({ size: "lg" })}
                href={lessonUrl(course, itemAt(course.course.lessons, 0).slug)}
              >
                Открыть первый урок{" "}
                <ArrowRightIcon size={18} aria-hidden="true" />
              </Link>
            </section>
            <LearnerEntry
              organizationSlug={course.organization.slug}
              offeringSlug={course.offering.slug}
              courseSlug={course.course.slug}
            />
          </aside>
          <section className={styles.program} aria-labelledby="lessons-title">
            <header className={styles.outlineHeading}>
              <Heading level={2} id="lessons-title">
                Программа курса
              </Heading>
              <Text muted size="sm">
                {lessonCount(course.course.lessons.length)} ·{" "}
                {durationLabel(duration)}
              </Text>
            </header>
            <LessonOutline course={course} />
          </section>
        </div>
      </LearningShell>
    </>
  );
}
