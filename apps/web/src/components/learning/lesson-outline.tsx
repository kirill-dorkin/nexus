import type { PublicLearningCourse } from "@platform/contracts";
import Link from "next/link";
import { Text } from "@platform/ui";
import { lessonUrl } from "../../lib/public-learning-routes";
import { durationLabel, lessonCount } from "./learning-labels";
import styles from "./flow.module.css";

type Lesson = PublicLearningCourse["course"]["lessons"][number];
export type ChapterGroup<T> = { title: string | null; lessons: { lesson: T; index: number }[] };
type Chapter = ChapterGroup<Lesson>;

/** Consecutive lessons with the same chapter form one group; lessons without a chapter stay ungrouped. */
export function groupByChapter<T extends { chapter?: string | null | undefined }>(lessons: readonly T[]): ChapterGroup<T>[] {
  const groups: ChapterGroup<T>[] = [];
  lessons.forEach((lesson, index) => {
    const title = lesson.chapter ?? null;
    const last = groups.at(-1);
    if (last?.title === title) last.lessons.push({ lesson, index });
    else groups.push({ title, lessons: [{ lesson, index }] });
  });
  return groups;
}

function LessonItems({ course, items, currentSlug }: {
  course: PublicLearningCourse;
  items: Chapter["lessons"];
  currentSlug: string | undefined;
}) {
  return (
    <ol className={styles.outline} start={items[0] ? items[0].index + 1 : 1}>
      {items.map(({ lesson, index }) => (
        <li key={lesson.slug}>
          <Link
            className={styles.lessonLink}
            href={lessonUrl(course, lesson.slug)}
            aria-current={lesson.slug === currentSlug ? "page" : undefined}
          >
            <span className={styles.number} aria-hidden="true">
              {String(index + 1).padStart(2, "0")}
            </span>
            <div>
              <strong>{lesson.title}</strong>
              {lesson.summary ? (
                <Text muted size="sm">
                  {lesson.summary}
                </Text>
              ) : null}
            </div>
            <span className={styles.minutes}>{lesson.durationMinutes} мин</span>
          </Link>
        </li>
      ))}
    </ol>
  );
}

/** The full course program on the course page, grouped by chapter. The lesson page uses CourseNavigator. */
export function LessonOutline({ course, currentSlug }: { course: PublicLearningCourse; currentSlug?: string }) {
  const groups = groupByChapter(course.course.lessons);
  if (groups.every((g) => g.title === null))
    return <LessonItems course={course} items={groups.flatMap((g) => g.lessons)} currentSlug={currentSlug} />;
  return (
    <div className={styles.chapters}>
      {groups.map((group, n) => {
        const minutes = group.lessons.reduce((sum, { lesson }) => sum + lesson.durationMinutes, 0);
        const meta = `${lessonCount(group.lessons.length)} · ${durationLabel(minutes)}`;
        return (
          <section key={n} className={styles.chapter} aria-label={group.title ?? undefined}>
            {group.title ? (
              <header className={styles.chapterHead}>
                <span className={styles.chapterIndex}>Глава {n + 1}</span>
                <h3>{group.title}</h3>
                <span className={styles.chapterMeta}>{meta}</span>
              </header>
            ) : null}
            <LessonItems course={course} items={group.lessons} currentSlug={currentSlug} />
          </section>
        );
      })}
    </div>
  );
}
