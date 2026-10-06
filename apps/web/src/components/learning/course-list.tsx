import type { PublicLearningCourse } from "@platform/contracts";
import Link from "next/link";
import { courseUrl } from "../../lib/public-learning";
import styles from "./learning.module.css";
export function CourseList({ courses }: { courses: PublicLearningCourse[] }) {
  if (courses.length === 0)
    return (
      <div className={styles.empty}>
        <h3>Курсы готовятся к открытию</h3>
        <p>Здесь появятся доступные бесплатные курсы.</p>
      </div>
    );
  return (
    <div className={styles.cards}>
      {courses.map((course) => (
        <article
          className={styles.card}
          key={`${course.organization.slug}/${course.offering.slug}`}
        >
          <p className={styles.eyebrow}>Бесплатно · В своём темпе</p>
          <h3>
            <Link href={courseUrl(course)}>{course.course.title}</Link>
          </h3>
          <p className={styles.muted}>{course.organization.name}</p>
          <p className={styles.excerpt}>{course.course.description}</p>
          <p className={styles.muted}>
            {course.course.lessons.length} уроков ·{" "}
            {course.course.lessons.reduce(
              (sum, lesson) => sum + lesson.durationMinutes,
              0
            )}{" "}
            мин
          </p>
          <Link className={styles.textLink} href={courseUrl(course)}>
            Посмотреть курс →
          </Link>
        </article>
      ))}
    </div>
  );
}
