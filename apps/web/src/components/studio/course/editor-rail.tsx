"use client";
import type { CourseManifestV1 } from "@platform/contracts";
import { Eyebrow, Stack, Text } from "@platform/ui";
import styles from "../studio.module.css";
import type { EditorMode } from "./use-course-draft";

/** Section links for the form, or a note about the JSON and preview modes. */
export function EditorRail({
  mode,
  document
}: {
  mode: EditorMode;
  document: CourseManifestV1;
}) {
  return (
    <aside className={styles.editorRail}>
      {mode === "manual" ? (
        <nav aria-label="Разделы содержимого курса">
          <Text muted size="sm">
            Содержимое
          </Text>
          {(
            [
              ["course", "Курс", null],
              ["skills", "Навыки", document.skills.length],
              ["activities", "Задания", document.activities.length],
              ["lessons", "Уроки", document.lessons.length]
            ] as const
          ).map(([id, label, count]) => (
            <a key={id} href={`#studio-${id}`}>
              <span>{label}</span>
              {count !== null && <span>{count}</span>}
            </a>
          ))}
        </nav>
      ) : (
        <Stack gap="sm">
          <Eyebrow>
            {mode === "json" ? "Рабочая копия" : "Взгляд ученика"}
          </Eyebrow>
          <Text muted size="sm">
            {mode === "json"
              ? "JSON и ручные поля изменяют один документ. Неверный JSON нужно исправить перед сменой режима."
              : "Предпросмотр показывает материалы и вопросы. Защищённые ответы в него не входят."}
          </Text>
        </Stack>
      )}
    </aside>
  );
}
