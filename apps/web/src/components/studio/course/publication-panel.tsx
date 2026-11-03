"use client";
import type { StudioDraft } from "@platform/contracts";
import { Button, Heading, Text } from "@platform/ui";
import styles from "../studio.module.css";
import type { CourseDraft } from "./use-course-draft";

function blockedReason(draft: CourseDraft, base: StudioDraft): string {
  if (!base.canPublish) return "У вас нет права публикации этой версии.";
  if (draft.uncertain) return "Сначала загрузите актуальный черновик.";
  if (draft.dirty) return "Сначала проверьте и сохраните изменения.";
  if (draft.mode !== "preview")
    return "Откройте предпросмотр, чтобы проверить сохранённую версию.";
  return "Публикация сейчас недоступна.";
}

/** Publishing a saved draft; the button explains why it is unavailable. */
export function PublicationPanel({
  draft,
  base,
  onPublish
}: {
  draft: CourseDraft;
  base: StudioDraft;
  onPublish: () => void;
}) {
  return (
    <section
      className={styles.publication}
      aria-labelledby="studio-publication-title"
    >
      <div>
        <Heading level={2} size="section" id="studio-publication-title">
          Публикация
        </Heading>
        <Text muted>
          Проверьте предпросмотр сохранённого черновика. Публикация зафиксирует
          эту версию. Публичное обучение настраивается отдельно.
        </Text>
        {draft.publishDisabled && !draft.busy && (
          <Text muted size="sm">
            {blockedReason(draft, base)}
          </Text>
        )}
      </div>
      <Button
        variant="secondary"
        disabled={draft.publishDisabled}
        onClick={onPublish}
      >
        Опубликовать версию {base.versionNumber}
      </Button>
    </section>
  );
}
