import type { PublicLearningCourse } from "@platform/contracts";
import Link from "next/link";
import Image from "next/image";
import { courseArtwork } from "./course-artwork";
import { ArrowRight } from "@phosphor-icons/react/dist/ssr";
import { EmptyState, Text } from "@platform/ui";
import { courseUrl } from "../../lib/public-learning-routes";
import { lessonCount } from "./learning-labels";
import styles from "./course-list.module.css";

export function CourseList({ courses }: { courses: PublicLearningCourse[] }) {
  if (courses.length === 0)
    return (
      <EmptyState title="Курсы готовятся к открытию">
        Здесь появятся доступные бесплатные курсы. Загляните чуть позже.
      </EmptyState>
    );
  return (
    <ul className={styles.list}>
      {courses.map((course, index) => {
        const artwork = courseArtwork(course.organization.slug, course.offering.slug);
        return (
        <li key={`${course.organization.slug}/${course.offering.slug}`}>
          <Link className={`${styles.row} ${artwork ? styles.withArtwork : ""}`} href={courseUrl(course)}>
            {artwork ? <Image className={styles.thumbnail} {...artwork} alt="" unoptimized sizes="(max-width: 760px) 80px, 192px" /> : <span className={styles.number} aria-hidden="true">
              {String(index + 1).padStart(2, "0")}
            </span>}
            <div className={styles.content}>
              <Text muted size="sm" className={styles.organization}>
                {course.organization.name}
              </Text>
              <h3>{course.course.title}</h3>
              {course.course.description && (
                <Text muted className={styles.description}>
                  {course.course.description}
                </Text>
              )}
              <div className={styles.meta}>
                <span>Бесплатно</span>
                <span>{lessonCount(course.course.lessons.length)}</span>
                <span>{course.course.lessons.reduce(
                  (sum, lesson) => sum + lesson.durationMinutes,
                  0
                )} мин</span>
              </div>
            </div>
            <ArrowRight className={styles.arrow} size={23} aria-hidden="true" />
          </Link>
        </li>
      ); })}
    </ul>
  );
}
