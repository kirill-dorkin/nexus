import type { PublicLearningCourse } from "@platform/contracts";
import Link from "next/link";
import { Text } from "@platform/ui";
import { lessonUrl } from "../../lib/public-learning-routes";
import { durationLabel, lessonCount } from "./learning-labels";
import styles from "./flow.module.css";

type Lesson = PublicLearningCourse["course"]["lessons"][number];
type Chapter = { title: string | null; lessons: { lesson: Lesson; index: number }[] };

/** Consecutive lessons with the same chapter form one group; lessons without a chapter stay ungrouped. */
export function groupByChapter(lessons: readonly Lesson[]): Chapter[] {
  const groups: Chapter[] = [];
  lessons.forEach((lesson, index) => {
    const title = lesson.chapter ?? null;
    const last = groups.at(-1);
    if (last && last.title === title) last.lessons.push({ lesson, index });
    else groups.push({ title, lessons: [{ lesson, index }] });
  });
  return groups;
}

function LessonItems({ course, items, currentSlug, compact }: {
  course: PublicLearningCourse;
  items: Chapter["lessons"];
  currentSlug: string | undefined;
  compact: boolean;
}) {
  return (
    <ol className={`${styles.outline} ${compact ? styles.outlineCompact : ""}`} start={items[0] ? items[0].index + 1 : 1}>
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
              {!compact && lesson.summary ? (
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

export function LessonOutline({
  course,
  currentSlug,
  compact = false
}: {
  course: PublicLearningCourse;
  currentSlug?: string;
  compact?: boolean;
}) {
  const groups = groupByChapter(course.course.lessons);
  if (groups.every((g) => g.title === null))
    return <LessonItems course={course} items={groups.flatMap((g) => g.lessons)} currentSlug={currentSlug} compact={compact} />;
  return (
    <div className={`${styles.chapters} ${compact ? styles.chaptersCompact : ""}`}>
      {groups.map((group, n) => {
        const minutes = group.lessons.reduce((sum, { lesson }) => sum + lesson.durationMinutes, 0);
        const meta = `${lessonCount(group.lessons.length)} · ${durationLabel(minutes)}`;
        const items = <LessonItems course={course} items={group.lessons} currentSlug={currentSlug} compact={compact} />;
        if (compact) {
          const current = group.lessons.some(({ lesson }) => lesson.slug === currentSlug);
          return (
            <details key={n} className={styles.chapterCompact} open={current || undefined}>
              <summary>
                <span>{group.title ?? "Без главы"}</span>
                <small>{group.lessons.length}</small>
              </summary>
              {items}
            </details>
          );
        }
        return (
          <section key={n} className={styles.chapter} aria-label={group.title ?? undefined}>
            {group.title ? (
              <header className={styles.chapterHead}>
                <span className={styles.chapterIndex}>Глава {n + 1}</span>
                <h3>{group.title}</h3>
                <span className={styles.chapterMeta}>{meta}</span>
              </header>
            ) : null}
            {items}
          </section>
        );
      })}
    </div>
  );
}
