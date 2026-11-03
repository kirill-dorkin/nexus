"use client";
import { Button, Disclosure, Text } from "@platform/ui";
import styles from "../studio.module.css";
import type { CourseDraft } from "./use-course-draft";

/** Downloads of the working and saved copies, and discarding local edits. */
export function FileActions({
  draft,
  onDiscard
}: {
  draft: CourseDraft;
  onDiscard: () => void;
}) {
  const { base, busy, dirty, uncertain, unsaved, mode } = draft;
  return (
    <Disclosure
      summary="Копии и сохранённая версия"
      className={styles.fileActions ?? ""}
      {...(uncertain ? { open: true } : {})}
    >
      <Text muted size="sm">
        Рабочая копия содержит текущие правки. Сохранённый JSON соответствует
        загруженной версии на сервере.
      </Text>
      <div className={styles.actions}>
        {base?.status === "draft" && (
          <Button
            variant="secondary"
            disabled={busy}
            onClick={draft.exportSaved}
          >
            Скачать сохранённый JSON
          </Button>
        )}
        <Button
          variant="secondary"
          disabled={busy}
          onClick={draft.exportWorking}
        >
          Скачать рабочую копию
        </Button>
        {base && (
          <Button
            variant="ghost"
            disabled={busy}
            onClick={() => {
              if (unsaved || uncertain) onDiscard();
              else void draft.reload();
            }}
          >
            {dirty || uncertain || mode === "json"
              ? "Отбросить изменения и загрузить сохранённое"
              : "Обновить сохранённое"}
          </Button>
        )}
      </div>
    </Disclosure>
  );
}
