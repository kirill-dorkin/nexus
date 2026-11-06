import type { PublicLearningCourse } from "@platform/contracts";
import Link from "next/link";
import { ArrowRightIcon } from "@phosphor-icons/react/dist/ssr";
import { ButtonLink } from "@platform/ui";
import { courseUrl, organizationName } from "../../lib/public-learning-routes";
import { LEARNING_ROUTE, routeStepNumber } from "../../lib/learning-route";
import { durationLabel, lessonCount } from "./learning-labels";
import styles from "./course-list.module.css";

function firstSentence(text: string) {
  return text.split(/(?<=[.!?])\s+/)[0]?.trim() ?? "";
}

export function CoursesEmpty() {
  return (
    <div className={styles.empty}>
      <span className={styles.emptyGlyph} aria-hidden="true" />
      <h3>Курсы готовятся к открытию</h3>
      <p>
        Здесь появятся бесплатные курсы. Пока можно почитать{" "}
        <Link href="/blog">блог</Link>.
      </p>
    </div>
  );
}

/** One course: what it is, how long it takes, and one obvious next step. */
export function CourseCard({
  course,
  index,
  featured = false
}: {
  course: PublicLearningCourse;
  index: number;
  featured?: boolean;
}) {
  const href = courseUrl(course);
  const lessons = course.course.lessons;
  const minutes = lessons.reduce(
    (sum, lesson) => sum + lesson.durationMinutes,
    0
  );
  const description = firstSentence(course.course.description);
  const step = routeStepNumber(course);
  return (
    <article
      className={`${styles.card} ${featured ? styles.featured : ""}`}
      data-tone={index % 3}
    >
      <div className={styles.cover} aria-hidden="true">
        <span className={styles.coverIndex}>
          {String(index + 1).padStart(2, "0")}
        </span>
        <ol className={styles.coverLessons}>
          {lessons.slice(0, featured ? 4 : 3).map((lesson, i) => (
            <li key={lesson.slug}>
              <span>{i + 1}</span>
              <span className={styles.lessonTitle}>{lesson.title}</span>
            </li>
          ))}
        </ol>
      </div>
      <div className={styles.body}>
        <p className={styles.organization}>
          {step
            ? `Шаг ${step} · ${LEARNING_ROUTE.title}`
            : organizationName(course.organization)}
        </p>
        <h3 className={styles.title}>
          <Link href={href}>{course.course.title}</Link>
        </h3>
        {description && <p className={styles.description}>{description}</p>}
        <ul className={styles.meta} aria-label="Сведения о курсе">
          <li>Бесплатно</li>
          <li>{lessonCount(lessons.length)}</li>
          {minutes > 0 && <li>{durationLabel(minutes)}</li>}
        </ul>
        <ButtonLink
          className={styles.action}
          href={href}
          variant={featured ? "primary" : "secondary"}
        >
          Посмотреть программу <ArrowRightIcon size={18} aria-hidden="true" />
        </ButtonLink>
      </div>
    </article>
  );
}

export function CourseList({ courses }: { courses: PublicLearningCourse[] }) {
  if (courses.length === 0) return <CoursesEmpty />;
  return (
    <ul className={styles.list}>
      {courses.map((course, index) => (
        <li key={`${course.organization.slug}/${course.offering.slug}`}>
          <CourseCard course={course} index={index} />
        </li>
      ))}
    </ul>
  );
}
