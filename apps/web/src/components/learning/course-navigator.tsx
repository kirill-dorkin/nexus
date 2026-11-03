"use client";
import { useRef, useState } from "react";
import { ListBulletsIcon, XIcon } from "@phosphor-icons/react/dist/ssr";
import { Program } from "./navigator/program";
import type { ProgramItem } from "./navigator/visited";
import styles from "./course-navigator.module.css";

export { matchesQuery, type ProgramItem } from "./navigator/visited";

/*
 * Course program next to a lesson. Built for long courses (100+ lessons):
 *   - the panel scrolls on its own and opens at the current lesson;
 *   - progress, the current chapter and a search field sit at the top;
 *   - lessons the visitor has opened are ticked (kept in this browser only);
 *   - on narrow screens the same panel opens as a full-height sheet from a floating button.
 */

/** Desktop side panel plus, on narrow screens, a floating button that opens the same program as a sheet. */
export function CourseNavigator({
  courseSlug,
  items,
  current
}: {
  courseSlug: string;
  items: ProgramItem[];
  current: string;
}) {
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
      <button
        type="button"
        className={styles.fab}
        onClick={() => setSheet(true)}
        aria-haspopup="dialog"
      >
        <ListBulletsIcon size={18} weight="bold" aria-hidden="true" />
        Программа
        <span>
          {index + 1}/{items.length}
        </span>
      </button>
      {sheet ? (
        // A click on the backdrop closes the sheet; Escape is handled natively by <dialog>.
        // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions
        <dialog
          ref={attach}
          className={styles.sheet}
          aria-label="Программа курса"
          onClose={() => setSheet(false)}
          onClick={(e) => {
            if (e.target === e.currentTarget) close();
          }}
        >
          <div className={styles.sheetInner}>
            <button
              type="button"
              className={styles.sheetClose}
              onClick={close}
              aria-label="Закрыть программу"
            >
              <XIcon size={18} aria-hidden="true" />
            </button>
            <Program
              courseSlug={courseSlug}
              items={items}
              current={current}
              onNavigate={close}
            />
          </div>
        </dialog>
      ) : null}
    </>
  );
}
