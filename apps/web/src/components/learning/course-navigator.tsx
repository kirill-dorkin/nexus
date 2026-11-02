"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { CheckCircle, ListBullets, MagnifyingGlass, X } from "@phosphor-icons/react/dist/ssr";
import { brand } from "@platform/brand";
import { groupByChapter } from "./lesson-outline";
import styles from "./course-navigator.module.css";

/*
 * Course program next to a lesson. Built for long courses (100+ lessons):
 *   - the panel scrolls on its own and opens at the current lesson;
 *   - progress, the current chapter and a search field sit at the top;
 *   - lessons the visitor has opened are ticked (kept in this browser only);
 *   - on narrow screens the same panel opens as a full-height sheet from a floating button.
 */

export type ProgramItem = { slug: string; title: string; chapter?: string | null | undefined; minutes: number; href: string };

const norm = (s: string) => s.toLocaleLowerCase("ru").replace(/ё/g, "е").trim();

/** Lessons whose title matches every word of the query (case- and ё-insensitive). */
export function matchesQuery(item: Pick<ProgramItem, "title" | "chapter">, query: string): boolean {
  const words = norm(query).split(/\s+/).filter(Boolean);
  if (!words.length) return true;
  const text = norm(`${item.title} ${item.chapter ?? ""}`);
  return words.every((w) => text.includes(w));
}

function visitedKey(course: string) {
  return `${brand.slug}:visited:${course}`;
}

/** Remembers which lessons this browser has opened. Never blocks rendering when storage is unavailable. */
function useVisited(course: string, current: string) {
  const [visited, setVisited] = useState<ReadonlySet<string>>(() => new Set());
  useEffect(() => {
    let list: string[] = [];
    try {
      list = JSON.parse(localStorage.getItem(visitedKey(course)) ?? "[]") as string[];
      if (!Array.isArray(list)) list = [];
      if (!list.includes(current)) {
        list = [...list, current];
        localStorage.setItem(visitedKey(course), JSON.stringify(list));
      }
    } catch {
      list = [current];
    }
    setVisited(new Set(list));
  }, [course, current]);
  return visited;
}

function Program({ courseSlug, items, current, onNavigate, autoFocusSearch = false }: {
  courseSlug: string;
  items: ProgramItem[];
  current: string;
  onNavigate?: () => void;
  autoFocusSearch?: boolean;
}) {
  const [query, setQuery] = useState("");
  const visited = useVisited(courseSlug, current);
  const scroller = useRef<HTMLDivElement>(null);
  const searchId = useId();
  const index = items.findIndex((i) => i.slug === current);
  const groups = useMemo(() => groupByChapter(items), [items]);
  const chaptered = groups.some((g) => g.title !== null);
  const currentChapter = groups.findIndex((g) => g.lessons.some(({ lesson }) => lesson.slug === current));
  const [open, setOpen] = useState<ReadonlySet<number>>(() => new Set([currentChapter]));
  const searching = query.trim().length > 0;
  const shown = useMemo(
    () => groups.map((g) => ({ ...g, lessons: g.lessons.filter(({ lesson }) => matchesQuery(lesson, query)) })),
    [groups, query]
  );
  const found = shown.reduce((n, g) => n + g.lessons.length, 0);

  // Open at the current lesson: scroll the panel itself, never the page.
  useEffect(() => {
    const box = scroller.current;
    const el = box?.querySelector<HTMLElement>('[aria-current="page"]');
    if (box && el) box.scrollTop = Math.max(0, el.offsetTop - box.clientHeight / 3);
  }, [current]);

  const toggle = (n: number) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(n)) next.delete(n);
      else next.add(n);
      return next;
    });

  const done = items.filter((i) => visited.has(i.slug)).length;
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
          <span style={{ width: `${Math.round((done / items.length) * 100)}%` }} />
        </div>
        <p className={styles.visitedLine}>Открыто уроков: {done} из {items.length}</p>
        <label className={styles.search} htmlFor={searchId}>
          <MagnifyingGlass size={16} aria-hidden="true" />
          <input
            id={searchId}
            type="search"
            value={query}
            autoFocus={autoFocusSearch}
            placeholder="Найти урок"
            aria-label="Найти урок по названию"
            onChange={(e) => setQuery(e.target.value)}
          />
          {searching ? (
            <button type="button" onClick={() => setQuery("")} aria-label="Очистить поиск">
              <X size={14} aria-hidden="true" />
            </button>
          ) : null}
        </label>
        {searching ? <p className={styles.found} role="status">{found ? `Найдено: ${found}` : "Ничего не нашлось"}</p> : null}
      </div>
      <div ref={scroller} className={styles.scroll}>
        {shown.map((group, n) => {
          if (!group.lessons.length) return null;
          const isOpen = !chaptered || searching || open.has(n);
          const all = groups[n]!.lessons;
          const seen = all.filter(({ lesson }) => visited.has(lesson.slug)).length;
          return (
            <section key={n} className={styles.chapter} data-current={n === currentChapter || undefined}>
              {chaptered ? (
                <button type="button" className={styles.chapterHead} aria-expanded={isOpen} onClick={() => toggle(n)} disabled={searching}>
                  <span className={styles.chapterNo}>{group.title ? `Глава ${n + 1}` : ""}</span>
                  <span className={styles.chapterTitle}>{group.title ?? "Без главы"}</span>
                  <span className={styles.chapterCount} aria-label={`открыто ${seen} из ${all.length}`}>
                    {seen}/{all.length}
                  </span>
                </button>
              ) : null}
              {isOpen ? (
                <ol className={styles.lessons}>
                  {group.lessons.map(({ lesson, index: i }) => {
                    const here = lesson.slug === current;
                    const seenLesson = visited.has(lesson.slug) && !here;
                    return (
                      <li key={lesson.slug}>
                        <Link
                          href={lesson.href}
                          className={styles.lesson}
                          aria-current={here ? "page" : undefined}
                          data-visited={seenLesson || undefined}
                          {...(onNavigate ? { onClick: onNavigate } : {})}
                        >
                          <span className={styles.no} aria-hidden="true">
                            {seenLesson ? <CheckCircle size={16} weight="fill" /> : i + 1}
                          </span>
                          <span className={styles.title}>{lesson.title}</span>
                          <span className={styles.minutes}>{lesson.minutes} мин</span>
                          {seenLesson ? <span className={styles.srOnly}> — уже открывали</span> : null}
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

/** Desktop side panel plus, on narrow screens, a floating button that opens the same program as a sheet. */
export function CourseNavigator({ courseSlug, items, current }: { courseSlug: string; items: ProgramItem[]; current: string }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [sheet, setSheet] = useState(false);
  const index = items.findIndex((i) => i.slug === current);
  const close = () => dialog.current?.close();
  // Open as a modal the moment the sheet is mounted (focus moves in, Escape and the backdrop close it).
  const attach = (el: HTMLDialogElement | null) => {
    dialog.current = el;
    if (el && !el.open) el.showModal();
  };
  return (
    <>
      <nav className={styles.panel} aria-label="Уроки курса">
        <Program courseSlug={courseSlug} items={items} current={current} />
      </nav>
      <button type="button" className={styles.fab} onClick={() => setSheet(true)} aria-haspopup="dialog">
        <ListBullets size={18} weight="bold" aria-hidden="true" />
        Программа
        <span>{index + 1}/{items.length}</span>
      </button>
      {sheet ? (
        <dialog
          ref={attach}
          className={styles.sheet}
          aria-label="Программа курса"
          onClose={() => setSheet(false)}
          onClick={(e) => { if (e.target === e.currentTarget) close(); }}
        >
          <div className={styles.sheetInner}>
            <button type="button" className={styles.sheetClose} onClick={close} aria-label="Закрыть программу">
              <X size={18} aria-hidden="true" />
            </button>
            <Program courseSlug={courseSlug} items={items} current={current} onNavigate={close} />
          </div>
        </dialog>
      ) : null}
    </>
  );
}
