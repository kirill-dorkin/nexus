"use client";
import { Button, Text } from "@platform/ui";
import styles from "../studio.module.css";
import type { CourseDraft, EditorMode } from "./use-course-draft";

const MODES: readonly (readonly [EditorMode, string])[] = [
  ["manual", "Ручной редактор"],
  ["json", "JSON"],
  ["preview", "Предпросмотр"]
];

/** Editor modes, validate and save, and a line saying what happens next. */
export function EditorToolbar({ draft }: { draft: CourseDraft }) {
  const { busy, mode, writable, uncertain, checked } = draft;
  return (
    <>
      <div className={styles.toolbar} id="studio-editor-actions">
        <div
          className={styles.modeGroup}
          role="group"
          aria-label="Режим редактора"
        >
          {MODES.map(([value, label]) => (
            <Button
              key={value}
              variant="ghost"
              disabled={busy}
              aria-pressed={mode === value}
              onClick={() => draft.switchMode(value)}
            >
              {label}
            </Button>
          ))}
        </div>
        <div className={styles.actions}>
          <Button
            variant="secondary"
            disabled={busy || !writable || uncertain}
            onClick={draft.validate}
          >
            Проверить документ
          </Button>
          <Button
            disabled={busy || !writable || !checked || uncertain}
            onClick={draft.apply}
          >
            Сохранить черновик
          </Button>
        </div>
      </div>
      <Text muted size="sm" role="status" className={styles.workflowHint}>
        {busy
          ? "Выполняем действие…"
          : uncertain
            ? "Рабочая копия сохранена в редакторе. Скачайте её перед загрузкой актуального черновика."
            : checked
              ? "Документ проверен. Сохранение применит именно эту проверенную копию."
              : "Изменения остаются в редакторе до проверки и сохранения. Автосохранения нет."}
      </Text>
    </>
  );
}
