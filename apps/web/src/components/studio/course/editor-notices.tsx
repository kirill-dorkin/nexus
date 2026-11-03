"use client";
import { Alert } from "@platform/ui";
import styles from "../studio.module.css";
import type { CourseDraft } from "./use-course-draft";

/** Errors, document issues and the last success message. */
export function EditorNotices({ draft }: { draft: CourseDraft }) {
  const { error, login, uncertain, ready, issues, message } = draft;
  return (
    <>
      {error && !login && (
        <Alert
          tone="danger"
          title={
            uncertain
              ? "Проверьте актуальный черновик"
              : ready
                ? "Операция не завершена"
                : "Не удалось открыть курс"
          }
          className={styles.notice}
        >
          {error}
        </Alert>
      )}
      {issues.length > 0 && (
        <Alert
          tone="danger"
          title="Исправьте документ"
          className={styles.notice}
        >
          <ul>
            {issues.map((issue, k) => (
              <li key={k}>{issue}</li>
            ))}
          </ul>
        </Alert>
      )}
      {message && (
        <Alert tone="success" role="status" className={styles.notice}>
          {message}
        </Alert>
      )}
    </>
  );
}
