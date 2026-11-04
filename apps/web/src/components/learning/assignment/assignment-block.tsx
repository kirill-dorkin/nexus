"use client";
import { useRef, useState, type DragEvent } from "react";
import Link from "next/link";
import {
  assignmentCheckResultSchema,
  uploadProblems,
  type AssignmentCheckResult,
  type PublicAssignmentActivity
} from "@platform/contracts";
import { Alert, Button, Stack, Text, buttonClass } from "@platform/ui";

import { browserApiRequest } from "../../../lib/public-api";
import { learningLoginUrl } from "../../../lib/learning-return-to";
import { lessonUrl } from "../../../lib/public-learning-routes";
import styles from "../flow.module.css";
import { AssignmentReport } from "./assignment-report";
import { describeProblem, readUpload, starterZip } from "./files";

/** ADR-0073: download the starter files, upload the work, see what to fix. */
export function AssignmentBlock({
  activity,
  organizationSlug,
  offeringSlug,
  courseSlug,
  lessonSlug
}: {
  activity: PublicAssignmentActivity;
  organizationSlug: string;
  offeringSlug: string;
  courseSlug: string;
  lessonSlug: string;
}) {
  const returnTo = lessonUrl(
    {
      organization: { slug: organizationSlug },
      offering: { slug: offeringSlug },
      course: { slug: courseSlug }
    },
    lessonSlug
  );
  const [files, setFiles] = useState<Record<string, string> | null>(null);
  const [notes, setNotes] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<AssignmentCheckResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [needsLogin, setNeedsLogin] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const attemptKey = useRef<string | null>(null);

  async function download() {
    const readme = [
      `# ${activity.title}`,
      "",
      activity.instructions,
      "",
      "## Что проверим",
      ...activity.checkLabels.map((label) => `- ${label}`),
      "",
      `Главный файл: ${activity.entry}. Разрешённые файлы: ${activity.allowedFiles.join(", ")}.`
    ].join("\n");
    const zip = await starterZip(activity.starterFiles, readme);
    const url = URL.createObjectURL(
      new Blob([zip.slice().buffer], { type: "application/zip" })
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = `${activity.slug}.zip`;
    link.click();
    URL.revokeObjectURL(url);
  }

  async function choose(list: FileList | null) {
    if (!list?.length) return;
    setError(null);
    setResult(null);
    try {
      const upload = await readUpload(Array.from(list));
      const problems = uploadProblems(upload.files, activity);
      setFiles(problems.length ? null : upload.files);
      setNotes([
        ...upload.dropped.map((path) => `Пропущен файл ${path}.`),
        ...problems.map((problem) => describeProblem(problem, activity.entry))
      ]);
      attemptKey.current = null;
    } catch {
      setFiles(null);
      setNotes([
        "Не получилось прочитать файлы. Проверьте, что это zip или текстовые файлы."
      ]);
    }
  }

  // Like a quiz answer: the first try joins the free course.
  async function startCourse() {
    const join = await browserApiRequest(
      `/v1/public/organizations/${encodeURIComponent(organizationSlug)}/memberships/me`,
      { method: "POST", body: "{}" }
    );
    if (!join.ok) return false;
    const enroll = await browserApiRequest(
      `/v1/me/learning/${encodeURIComponent(organizationSlug)}/${encodeURIComponent(offeringSlug)}/enrollment`,
      { method: "POST", body: "{}" }
    );
    return enroll.ok;
  }

  const post = () =>
    browserApiRequest(
      `/v1/me/learning/${encodeURIComponent(organizationSlug)}/${encodeURIComponent(offeringSlug)}/assignments/${encodeURIComponent(activity.slug)}/submissions`,
      {
        method: "POST",
        body: JSON.stringify({ attemptKey: attemptKey.current, files })
      }
    );

  async function send() {
    if (!files || busy) return;
    setBusy(true);
    setError(null);
    attemptKey.current ??= crypto.randomUUID();
    try {
      let response = await post();
      if ([403, 404, 409].includes(response.status) && (await startCourse()))
        response = await post();
      if (response.status === 401) setNeedsLogin(true);
      else if (response.status === 429)
        setError("Слишком много сдач подряд. Подождите несколько минут.");
      else if (response.status === 400)
        setError(
          "Эти файлы не получилось проверить. Проверьте их и выберите снова."
        );
      else if (!response.ok)
        setError("Проверка не завершилась. Отправьте эти же файлы ещё раз.");
      else {
        setResult(assignmentCheckResultSchema.parse(await response.json()));
        attemptKey.current = null;
        window.dispatchEvent(new Event("learning-progress-changed"));
      }
    } catch {
      setError("Нет связи. Отправьте эти же файлы ещё раз.");
    } finally {
      setBusy(false);
    }
  }

  const drop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    void choose(event.dataTransfer.files);
  };

  return (
    <Stack gap="md">
      <div>
        <Text muted>Что проверим:</Text>
        <ul>
          {activity.checkLabels.map((label) => (
            <li key={label}>{label}</li>
          ))}
        </ul>
      </div>
      <div>
        <Button variant="secondary" onClick={() => void download()}>
          Скачать заготовку
        </Button>
      </div>
      {/* eslint-disable-next-line jsx-a11y/no-static-element-interactions -- dropping files is a pointer shortcut; the file input inside is the keyboard path */}
      <div
        className={styles.dropZone}
        onDragOver={(event) => {
          event.preventDefault();
        }}
        onDrop={drop}
      >
        <label htmlFor={`${activity.slug}-files`}>
          Выберите zip-архив или файлы задания (
          {activity.allowedFiles.join(", ")}), или перетащите их сюда.
        </label>
        <input
          ref={input}
          id={`${activity.slug}-files`}
          type="file"
          multiple
          accept=".zip,.html,.htm,.css,.svg,.txt,.md"
          onChange={(event) => void choose(event.target.files)}
        />
      </div>
      {files && (
        <Text>Готово к отправке: {Object.keys(files).sort().join(", ")}.</Text>
      )}
      {notes.length > 0 && (
        <ul aria-label="Замечания к файлам">
          {notes.map((note) => (
            <li key={note}>{note}</li>
          ))}
        </ul>
      )}
      <div>
        <Button disabled={!files || busy} onClick={() => void send()}>
          {busy ? "Проверяем…" : "Отправить на проверку"}
        </Button>
      </div>
      <div aria-live="polite">
        {error && <Alert tone="danger">{error}</Alert>}
        {result && <AssignmentReport result={result} />}
      </div>
      {needsLogin && (
        <div className={styles.quizSignup} role="status">
          <strong>Файлы готовы к проверке — осталось войти</strong>
          <p>
            Аккаунт бесплатный. После входа вернитесь к этому заданию и
            отправьте файлы.
          </p>
          <div className={styles.quizSignupActions}>
            <Link
              className={buttonClass({ size: "md" })}
              href={`${learningLoginUrl(returnTo)}&mode=register`}
            >
              Создать аккаунт
            </Link>
            <Link
              className={buttonClass({ size: "md", variant: "secondary" })}
              href={learningLoginUrl(returnTo)}
            >
              Войти
            </Link>
          </div>
        </div>
      )}
    </Stack>
  );
}
