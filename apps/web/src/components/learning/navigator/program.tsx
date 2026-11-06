"use client";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  CheckCircleIcon,
  MagnifyingGlassIcon,
  XIcon
} from "@phosphor-icons/react/dist/ssr";
import { itemAt } from "../../../lib/item-at";
import { groupByChapter } from "../lesson-outline";
import styles from "../course-navigator.module.css";
import type { OwnProgress } from "./own-progress";
import { matchesQuery, useVisited, type ProgramItem } from "./visited";

export function Program({
  courseSlug,
  items,
  current,
  progress = null,
  onNavigate
}: {
  courseSlug: string;
  items: ProgramItem[];
  current: string;
  /** The signed-in learner's saved progress; null shows the lessons opened in this browser. */
  progress?: OwnProgress | null;
  onNavigate?: () => void;
}) {
  const [query, setQuery] = useState("");
  const visited = useVisited(courseSlug, current);
  // A learner who started the course sees lessons whose test is passed; a guest sees opened ones.
  const ticked = progress ? progress.passed : visited;
  const scroller = useRef<HTMLDivElement>(null);
  const searchId = useId();
  const index = items.findIndex((i) => i.slug === current);
  const groups = useMemo(() => groupByChapter(items), [items]);
  const chaptered = groups.some((g) => g.title !== null);
  const currentChapter = groups.findIndex((g) =>
    g.lessons.some(({ lesson }) => lesson.slug === current)
  );
  const [open, setOpen] = useState<ReadonlySet<number>>(
    () => new Set([currentChapter])
  );
  const searching = query.trim().length > 0;
  const shown = useMemo(
    () =>
      groups.map((g) => ({
        ...g,
        lessons: g.lessons.filter(({ lesson }) => matchesQuery(lesson, query))
      })),
    [groups, query]
  );
  const found = shown.reduce((n, g) => n + g.lessons.length, 0);

  // Open at the current lesson: scroll the panel itself, never the page.
  useEffect(() => {
    const box = scroller.current;
    const el = box?.querySelector<HTMLElement>('[aria-current="page"]');
    if (box && el)
      box.scrollTop = Math.max(0, el.offsetTop - box.clientHeight / 3);
  }, [current]);

  const toggle = (n: number) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(n)) next.delete(n);
      else next.add(n);
      return next;
    });

  const done = items.filter((i) => ticked.has(i.slug)).length;
  return (
    <div className={styles.program}>
      <div className={styles.top}>
        <div className={styles.position}>
          <span className={styles.label}>Программа курса</span>
          <span className={styles.count}>
            Урок <strong>{index + 1}</strong> из {items.length}
          </span>
        </div>
        <div className={styles.meter} aria-hidden="true">
          <span
            style={{ width: `${Math.round((done / items.length) * 100)}%` }}
          />
        </div>
        <p className={styles.visitedLine}>
          {progress ? "Пройдено уроков" : "Открыто уроков"}: {done} из{" "}
          {items.length}
        </p>
        <label className={styles.search} htmlFor={searchId}>
          <MagnifyingGlassIcon size={16} aria-hidden="true" />
          <input
            id={searchId}
            type="search"
            value={query}
            placeholder="Найти урок"
            aria-label="Найти урок по названию"
            onChange={(e) => setQuery(e.target.value)}
          />
          {searching ? (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label="Очистить поиск"
            >
              <XIcon size={14} aria-hidden="true" />
            </button>
          ) : null}
        </label>
        {searching ? (
          <p className={styles.found} role="status">
            {found ? `Найдено: ${found}` : "Ничего не нашлось"}
          </p>
        ) : null}
      </div>
      <div ref={scroller} className={styles.scroll}>
        {shown.map((group, n) => {
          if (!group.lessons.length) return null;
          const isOpen = !chaptered || searching || open.has(n);
          const all = itemAt(groups, n).lessons;
          const seen = all.filter(({ lesson }) =>
            ticked.has(lesson.slug)
          ).length;
          return (
            <section
              key={n}
              className={styles.chapter}
              data-current={n === currentChapter || undefined}
            >
              {chaptered ? (
                <button
                  type="button"
                  className={styles.chapterHead}
                  aria-expanded={isOpen}
                  onClick={() => toggle(n)}
                  disabled={searching}
                >
                  <span className={styles.chapterNo}>
                    {group.title ? `Глава ${n + 1}` : ""}
                  </span>
                  <span className={styles.chapterTitle}>
                    {group.title ?? "Без главы"}
                  </span>
                  <span
                    className={styles.chapterCount}
                    aria-label={`${progress ? "пройдено" : "открыто"} ${seen} из ${all.length}`}
                  >
                    {seen}/{all.length}
                  </span>
                </button>
              ) : null}
              {isOpen ? (
                <ol className={styles.lessons}>
                  {group.lessons.map(({ lesson, index: i }) => {
                    const here = lesson.slug === current;
                    // A passed lesson keeps its tick even when it is the open one.
                    const seenLesson =
                      ticked.has(lesson.slug) && (progress !== null || !here);
                    const isNext = progress?.next === lesson.slug && !here;
                    return (
                      <li key={lesson.slug}>
                        <Link
                          href={lesson.href}
                          className={styles.lesson}
                          aria-current={here ? "page" : undefined}
                          data-visited={seenLesson || undefined}
                          data-next={isNext || undefined}
                          {...(onNavigate ? { onClick: onNavigate } : {})}
                        >
                          <span className={styles.no} aria-hidden="true">
                            {seenLesson ? (
                              <CheckCircleIcon size={16} weight="fill" />
                            ) : (
                              i + 1
                            )}
                          </span>
                          <span className={styles.title}>{lesson.title}</span>
                          <span className={styles.minutes}>
                            {isNext ? "Следующий" : `${lesson.minutes} мин`}
                          </span>
                          {seenLesson ? (
                            <span className={styles.srOnly}>
                              {" "}
                              {progress ? "— пройден" : "— уже открывали"}
                            </span>
                          ) : null}
                        </Link>
                      </li>
                    );
                  })}
                </ol>
              ) : null}
            </section>
          );
        })}
      </div>
    </div>
  );
}
