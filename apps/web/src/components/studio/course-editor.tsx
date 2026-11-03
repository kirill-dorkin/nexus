"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Alert,
  Badge,
  Button,
  EmptyState,
  Eyebrow,
  Heading,
  Skeleton,
  Text,
  buttonClass
} from "@platform/ui";
import { learningLoginUrl } from "../../lib/learning-return-to";
import { DraftPreview } from "./draft-preview";
import { ManualEditor } from "./manual-editor";
import { downloadManifest, downloadManifestText } from "./studio-api";
import { DiscardDialog, PublishDialog } from "./course/editor-dialogs";
import { EditorNotices } from "./course/editor-notices";
import { EditorRail } from "./course/editor-rail";
import { EditorToolbar } from "./course/editor-toolbar";
import { FileActions } from "./course/file-actions";
import { JsonEditor } from "./course/json-editor";
import { PublicationPanel } from "./course/publication-panel";
import { useCourseDraft } from "./course/use-course-draft";
import { useLeaveGuard } from "./course/use-leave-guard";
import styles from "./studio.module.css";

/** Studio editor for one course: form, JSON and preview over one working copy. */
export function CourseEditor({
  organizationId,
  courseId
}: {
  organizationId: string;
  courseId: string;
}) {
  const router = useRouter();
  const draft = useCourseDraft({
    organizationId,
    courseId,
    onCreated: (created) =>
      router.replace(`/studio/${organizationId}/${created}`)
  });
  const { base, document, mode, isNew, ready, busy, error, login } = draft;
  const leaveBlocked = draft.unsaved || draft.uncertain;
  const [leaveHref, setLeaveHref] = useLeaveGuard(leaveBlocked, ready);
  const [discardOpen, setDiscardOpen] = useState(false);
  const [publishOpen, setPublishOpen] = useState(false);
  const closeDiscard = () => {
    setDiscardOpen(false);
    setLeaveHref(null);
  };

  return (
    <>
      <Link
        href="/studio"
        className={styles.backLink}
        onClick={(event) => {
          if (!leaveBlocked) return;
          event.preventDefault();
          setLeaveHref("/studio");
        }}
      >
        ← Все курсы
      </Link>
      <header className={`${styles.pageHeading} ${styles.editorHeading}`}>
        <Eyebrow>{isNew ? "Новый материал" : "Редактор курса"}</Eyebrow>
        <Heading level={1} size="display">
          {isNew
            ? "Новый курс"
            : base?.manifest.course.title || "Редактор курса"}
        </Heading>
        <div className={styles.statusLine}>
          {base && (
            <>
              <Badge tone={base.status === "draft" ? "accent" : "neutral"}>
                {base.status === "draft" ? "Черновик" : "Опубликованная версия"}{" "}
                · версия {base.versionNumber}
              </Badge>
              <Text muted size="sm">
                {draft.dirty
                  ? "Есть несохранённые изменения"
                  : "Загружена сохранённая версия"}
              </Text>
            </>
          )}
          {isNew && (
            <Text muted>
              Начните с описания, затем добавьте навыки, задания и уроки.
            </Text>
          )}
        </div>
      </header>
      <EditorNotices draft={draft} />
      {login ? (
        <EmptyState
          title="Войдите в авторскую среду"
          action={
            <Link
              className={buttonClass()}
              href={learningLoginUrl(`/studio/${organizationId}/${courseId}`)}
            >
              Войти в Studio
            </Link>
          }
        >
          После входа вы вернётесь к этому курсу. Возможность редактирования
          зависит от ваших прав.
        </EmptyState>
      ) : !ready ? (
        error ? (
          <Button variant="secondary" onClick={() => window.location.reload()}>
            Повторить загрузку
          </Button>
        ) : (
          <div role="status" className={styles.loading}>
            <Text muted>Загружаем курс…</Text>
            <Skeleton style={{ height: "6rem" }} />
            <Skeleton style={{ height: "12rem" }} />
          </div>
        )
      ) : (
        <>
          {!draft.writable && (
            <Alert tone="neutral" className={styles.notice}>
              {base?.status === "published"
                ? "Эта версия неизменяема. Создайте следующий черновик для редактирования."
                : "Для сохранения нужны права управления курсом, заданиями и навыками организации."}
            </Alert>
          )}
          {base?.status === "published" && base.canApply && (
            <Button
              variant="secondary"
              disabled={busy}
              onClick={draft.createDraft}
            >
              Создать следующий черновик
            </Button>
          )}
          <EditorToolbar draft={draft} />
          <div className={styles.editorLayout}>
            <EditorRail mode={mode} document={document} />
            <div className={styles.editorBody}>
              {mode !== "preview" && (
                <fieldset
                  disabled={busy || !draft.writable}
                  className={styles.contentFieldset}
                >
                  <legend className={styles.srOnly}>Содержимое курса</legend>
                  {mode === "manual" && (
                    <ManualEditor
                      document={document}
                      edit={draft.edit}
                      existing={!isNew}
                    />
                  )}
                  {mode === "json" && (
                    <JsonEditor
                      raw={draft.raw}
                      onChange={draft.setJson}
                      onUpload={draft.uploadJson}
                    />
                  )}
                </fieldset>
              )}
              {mode === "preview" && <DraftPreview document={document} />}
              {draft.checked && (
                <Alert tone="neutral" className={styles.notice}>
                  План:{" "}
                  {draft.checked.plan.mode === "create_course"
                    ? "создание курса"
                    : "замена текущего черновика"}
                  ; навыков: {draft.checked.plan.counts.skills}, заданий:{" "}
                  {draft.checked.plan.counts.activities}, уроков:{" "}
                  {draft.checked.plan.counts.lessons}.
                </Alert>
              )}
              <FileActions
                draft={draft}
                onDiscard={() => setDiscardOpen(true)}
              />
              <a
                className={styles.returnToActions}
                href="#studio-editor-actions"
              >
                К проверке и сохранению ↑
              </a>
              {base?.status === "draft" && (
                <PublicationPanel
                  draft={draft}
                  base={base}
                  onPublish={() => setPublishOpen(true)}
                />
              )}
            </div>
          </div>
          <DiscardDialog
            open={discardOpen || leaveHref !== null}
            leaving={leaveHref !== null}
            onStay={closeDiscard}
            onDownload={() => {
              if (mode === "json")
                downloadManifestText(draft.raw, document.course.slug);
              else downloadManifest(document, document.course.slug);
            }}
            onDiscard={() => {
              const destination = leaveHref;
              closeDiscard();
              if (destination) router.push(destination);
              else void draft.reload();
            }}
          />
          <PublishDialog
            open={publishOpen}
            versionNumber={base?.versionNumber}
            title={base?.manifest.course.title}
            disabled={draft.publishDisabled}
            onCancel={() => setPublishOpen(false)}
            onConfirm={() => {
              setPublishOpen(false);
              void draft.publish();
            }}
          />
        </>
      )}
    </>
  );
}
