import type { PublicLearningCourse } from "@platform/contracts";
import Link from "next/link";
import { ArrowRight } from "@phosphor-icons/react/dist/ssr";
import { EmptyState, Text } from "@platform/ui";
import { courseUrl } from "../../lib/public-learning-routes";
import styles from "./course-list.module.css";

function lessonCount(count: number) {
  const last = count % 10;
  const teen = count % 100 >= 11 && count % 100 <= 14;
  return `${count} ${teen ? "уроков" : last === 1 ? "урок" : last >= 2 && last <= 4 ? "урока" : "уроков"}`;
}
export function CourseList({ courses }: { courses: PublicLearningCourse[] }) {
  if (courses.length === 0)
    return (
      <EmptyState title="Курсы готовятся к открытию">
        Здесь появятся доступные бесплатные курсы. Загляните чуть позже.
      </EmptyState>
    );
  return (
    <ul className={styles.list}>
      {courses.map((course, index) => (
        <li key={`${course.organization.slug}/${course.offering.slug}`}>
          <Link className={styles.row} href={courseUrl(course)}>
            <span className={styles.number} aria-hidden="true">
              {String(index + 1).padStart(2, "0")}
            </span>
            <div className={styles.content}>
              <Text muted size="sm">
                {course.organization.name}
              </Text>
              <h3>{course.course.title}</h3>
              {course.course.description && (
                <Text muted className={styles.description}>
                  {course.course.description}
                </Text>
              )}
              <p className={styles.meta}>
                Бесплатно <span aria-hidden="true">·</span>{" "}
                {lessonCount(course.course.lessons.length)}{" "}
                <span aria-hidden="true">·</span>{" "}
                {course.course.lessons.reduce(
                  (sum, lesson) => sum + lesson.durationMinutes,
                  0
                )}{" "}
                мин
              </p>
            </div>
            <ArrowRight className={styles.arrow} size={23} aria-hidden="true" />
          </Link>
        </li>
      ))}
    </ul>
  );
}
