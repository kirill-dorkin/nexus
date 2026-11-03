"use client";
import { Button, Dialog, Eyebrow, Heading, Text } from "@platform/ui";
import styles from "../studio.module.css";

/** Confirms losing the working copy, to leave the editor or to reload the saved draft. */
export function DiscardDialog({
  open,
  leaving,
  onStay,
  onDownload,
  onDiscard
}: {
  open: boolean;
  leaving: boolean;
  onStay: () => void;
  onDownload: () => void;
  onDiscard: () => void;
}) {
  return (
    <Dialog
      open={open}
      onDismiss={onStay}
      aria-labelledby="studio-discard-title"
      aria-describedby="studio-discard-description"
      className={styles.confirmation}
    >
      <Eyebrow>Несохранённая работа</Eyebrow>
      <Heading level={2} size="section" id="studio-discard-title">
        {leaving ? "Выйти из редактора?" : "Отбросить текущие правки?"}
      </Heading>
      <Text id="studio-discard-description">
        Текущая рабочая копия будет потеряна. Перед продолжением можно скачать
        её; сохранённая версия на сервере останется без изменений.
      </Text>
      <div className={styles.actions}>
        <Button
          variant="secondary"
          // A destructive confirmation opens on the safe choice (WAI-ARIA APG).
          // eslint-disable-next-line jsx-a11y/no-autofocus
          autoFocus
          onClick={onStay}
        >
          Остаться в редакторе
        </Button>
        <Button variant="ghost" onClick={onDownload}>
          Скачать рабочую копию
        </Button>
        <Button onClick={onDiscard}>
          {leaving ? "Выйти без сохранения" : "Отбросить и загрузить"}
        </Button>
      </div>
    </Dialog>
  );
}

/** Confirms fixing a saved draft as an immutable published version. */
export function PublishDialog({
  open,
  versionNumber,
  title,
  disabled,
  onCancel,
  onConfirm
}: {
  open: boolean;
  versionNumber: number | undefined;
  title: string | undefined;
  disabled: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <Dialog
      open={open}
      onDismiss={onCancel}
      aria-labelledby="studio-publish-title"
      aria-describedby="studio-publish-description"
      className={styles.confirmation}
    >
      <Eyebrow>Публикация курса</Eyebrow>
      <Heading level={2} size="section" id="studio-publish-title">
        Зафиксировать версию {versionNumber}?
      </Heading>
      <Text id="studio-publish-description">
        Будет опубликован сохранённый черновик «{title}». Эту версию нельзя
        изменить; дальнейшие правки потребуют нового черновика.
      </Text>
      <Text muted size="sm">
        Это не открывает курс ученикам. Настройка публичного обучения
        выполняется отдельно.
      </Text>
      <div className={styles.actions}>
        <Button
          variant="secondary"
          // A confirmation opens on the safe choice (WAI-ARIA APG).
          // eslint-disable-next-line jsx-a11y/no-autofocus
          autoFocus
          onClick={onCancel}
        >
          Отмена
        </Button>
        <Button disabled={disabled} onClick={onConfirm}>
          Подтвердить публикацию
        </Button>
      </div>
    </Dialog>
  );
}
