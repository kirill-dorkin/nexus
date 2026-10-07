import type { PublicLearningCourse } from "@platform/contracts";
import Link from "next/link";
import { Text } from "@platform/ui";
import { lessonUrl } from "../../lib/public-learning";
import styles from "./flow.module.css";

export function LessonOutline({
  course,
  currentSlug
}: {
  course: PublicLearningCourse;
  currentSlug?: string;
}) {
  return (
    <ol className={styles.outline}>
      {course.course.lessons.map((lesson, index) => (
        <li key={lesson.slug}>
          <Link
            className={styles.lessonLink}
            href={lessonUrl(course, lesson.slug)}
            aria-current={lesson.slug === currentSlug ? "page" : undefined}
          >
            <span className={styles.number}>
              {String(index + 1).padStart(2, "0")}
            </span>
            <div>
              <strong>{lesson.title}</strong>
              <Text muted size="sm">
                {lesson.summary}
              </Text>
            </div>
            <span className={styles.minutes}>{lesson.durationMinutes} мин</span>
          </Link>
        </li>
      ))}
    </ol>
  );
}
