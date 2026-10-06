"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  courseManifestV1Schema,
  studioCourseListSchema,
  studioDraftSchema,
  type CourseManifestV1,
  type CourseManifestPlan,
  type StudioDraft
} from "@platform/contracts";
import { learningLoginUrl } from "../../lib/learning-return-to";
import { blankCourse, parseEditorJson } from "./editor-model";
import { ManualEditor } from "./manual-editor";
import { DraftPreview } from "./draft-preview";
import { downloadManifest, studioRequest, StudioError } from "./studio-api";
import styles from "./studio.module.css";
type Plan = { document: CourseManifestV1; plan: CourseManifestPlan };
export function CourseEditor({
  organizationId: org,
  courseId: routeCourse
}: {
  organizationId: string;
  courseId: string;
}) {
  const router = useRouter();
  const isNew = routeCourse === "new",
    path = `organizations/${org}`,
    returnTo = `/studio/${org}/${routeCourse}`;
  const [base, setBase] = useState<StudioDraft | null>(null),
    [document, setDocument] = useState<CourseManifestV1>(blankCourse),
    [raw, setRaw] = useState(""),
    [mode, setMode] = useState<"manual" | "json" | "preview">("manual"),
    [checked, setChecked] = useState<Plan | null>(null),
    [issues, setIssues] = useState<string[]>([]),
    [error, setError] = useState<string | null>(null),
    [message, setMessage] = useState<string | null>(null),
    [ready, setReady] = useState(false),
    [busy, setBusy] = useState(false),
    [login, setLogin] = useState(false),
    [canCreate, setCanCreate] = useState(false),
    [uncertain, setUncertain] = useState(false);
  const inFlight = useRef(false);
  const dirty =
    base !== null && JSON.stringify(document) !== JSON.stringify(base.manifest);
  const writable =
    ready && (isNew ? canCreate : base?.status === "draft" && base.canApply);
  const changed = () => {
    setChecked(null);
    setIssues([]);
    setMessage(null);
  };
  function install(value: StudioDraft) {
    setBase(value);
    setDocument(value.manifest);
    setRaw(JSON.stringify(value.manifest, null, 2));
    setReady(true);
    setUncertain(false);
    setChecked(null);
    setIssues([]);
  }
  useEffect(() => {
    let cancelled = false;
    const load = isNew
      ? studioRequest(`${path}/studio/courses`)
      : studioRequest(`${path}/studio/courses/${routeCourse}`);
    load
      .then((value) => {
        if (cancelled) return;
        if (isNew) {
          setCanCreate(studioCourseListSchema.parse(value).canCreate);
          setReady(true);
        } else install(studioDraftSchema.parse(value));
      })
      .catch((e) => {
        if (!cancelled) {
          setError(e.message);
          setLogin(e instanceof StudioError && e.status === 401);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [isNew, path, routeCourse]);
  useEffect(() => {
    if (
      !dirty &&
      !(mode === "json" && raw !== JSON.stringify(document, null, 2)) &&
      !(isNew && (document.course.title || document.lessons.length))
    )
      return;
    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [
    dirty,
    isNew,
    document.course.title,
    document.lessons.length,
    mode,
    raw,
    document
  ]);
  function edit(change: (d: CourseManifestV1) => void) {
    setDocument((old) => {
      const next = structuredClone(old);
      change(next);
      return next;
    });
    changed();
  }
  function working(): CourseManifestV1 | null {
    const result =
      mode === "json"
        ? parseEditorJson(raw)
        : parseEditorJson(JSON.stringify(document));
    setIssues(result.issues);
    if (!result.manifest) return null;
    if (base && result.manifest.course.slug !== base.slug) {
      setIssues(["course.slug: адрес существующего курса нельзя менять."]);
      return null;
    }
    return result.manifest;
  }
  function switchMode(next: typeof mode) {
    if (next === mode) return;
    if (next === "json") {
      setRaw(JSON.stringify(document, null, 2));
      setMode(next);
      return;
    }
    const d = working();
    if (!d) return;
    setDocument(d);
    setMode(next);
  }
  async function operation(fn: () => Promise<void>) {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      await fn();
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Не удалось завершить операцию."
      );
      if (e instanceof StudioError && e.status === 401) setLogin(true);
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }
  async function validate() {
    const d = working();
    if (!d) return;
    await operation(async () => {
      const plan = (await studioRequest(
        `${path}/courses/manifest/validate`,
        d
      )) as CourseManifestPlan;
      const expectedVersion = base?.status === "draft" ? base.versionId : null,
        expectedRevision = base?.status === "draft" ? base.revision : 0;
      if (
        plan.expectedDraftVersionId !== expectedVersion ||
        plan.expectedRevision !== expectedRevision ||
        (isNew && plan.courseId !== null)
      ) {
        setChecked(null);
        setUncertain(true);
        throw new StudioError(
          409,
          "На сервере уже другой черновик. Скачайте рабочую копию и загрузите актуальную версию перед сохранением."
        );
      }
      setDocument(d);
      setChecked({ document: d, plan });
      setMessage("Проверка пройдена. Можно сохранить черновик.");
    });
  }
  async function apply() {
    if (!checked) return;
    const candidate = checked;
    setChecked(null);
    await operation(async () => {
      try {
        const result = await studioRequest(`${path}/courses/manifest/apply`, {
          manifest: candidate.document,
          expectedDraftVersionId: candidate.plan.expectedDraftVersionId,
          expectedRevision: candidate.plan.expectedRevision
        });
        if (isNew) {
          router.replace(`/studio/${org}/${result.courseId}`);
          return;
        }
        install(
          studioDraftSchema.parse(
            await studioRequest(`${path}/studio/courses/${routeCourse}`)
          )
        );
        setMode("manual");
        setMessage("Черновик сохранён.");
      } catch (e) {
        setUncertain(true);
        throw e;
      }
    });
  }
  async function reload() {
    await operation(async () => {
      install(
        studioDraftSchema.parse(
          await studioRequest(`${path}/studio/courses/${routeCourse}`)
        )
      );
      setMode("manual");
      setMessage("Загружен актуальный черновик.");
    });
  }
  async function createDraft() {
    await operation(async () => {
      await studioRequest(`${path}/studio/courses/${routeCourse}/draft`, {});
      install(
        studioDraftSchema.parse(
          await studioRequest(`${path}/studio/courses/${routeCourse}`)
        )
      );
      setMode("manual");
      setMessage("Создан следующий черновик.");
    });
  }
  async function publish() {
    if (!base || dirty || mode === "json" || uncertain) return;
    await operation(async () => {
      try {
        await studioRequest(`${path}/studio/courses/${routeCourse}/publish`, {
          draftVersionId: base.versionId,
          expectedRevision: base.revision
        });
        install(
          studioDraftSchema.parse(
            await studioRequest(`${path}/studio/courses/${routeCourse}`)
          )
        );
        setMessage(
          "Версия опубликована. Новые изменения потребуют следующего черновика."
        );
      } catch (e) {
        setUncertain(true);
        throw e;
      }
    });
  }
  async function exportDraft() {
    if (!base) return;
    await operation(async () => {
      const canonical = courseManifestV1Schema.parse(
        await studioRequest(
          `${path}/courses/${routeCourse}/versions/${base.versionId}/manifest`
        )
      );
      downloadManifest(canonical, canonical.course.slug);
      setMessage("Скачан сохранённый черновик.");
    });
  }
  async function uploadJson(file: File | undefined) {
    if (!file) return;
    if (file.size > 900000) {
      setError("JSON-файл должен быть не больше 900 КБ.");
      return;
    }
    const text = await file.text();
    setRaw(text);
    setMode("json");
    changed();
    const parsed = parseEditorJson(text);
    setIssues(parsed.issues);
    if (parsed.manifest) setDocument(parsed.manifest);
  }
  return (
    <>
      <Link href="/studio">← Все курсы</Link>
      <h1>
        {isNew ? "Новый курс" : base?.manifest.course.title || "Редактор курса"}
      </h1>
      {base && (
        <p>
          {base.status === "draft" ? "Черновик" : "Опубликованная версия"} ·
          версия {base.versionNumber}
          {dirty ? " · есть несохранённые изменения" : ""}
        </p>
      )}
      {error && (
        <p role="alert" className={styles.error}>
          {error}
        </p>
      )}
      {issues.length > 0 && (
        <div role="alert">
          <p>Исправьте документ:</p>
          <ul>
            {issues.map((i, k) => (
              <li key={k}>{i}</li>
            ))}
          </ul>
        </div>
      )}
      {message && <p role="status">{message}</p>}
      {login ? (
        <Link href={learningLoginUrl(returnTo)}>Войти в Studio</Link>
      ) : !ready ? (
        <p role="status">Загрузка…</p>
      ) : (
        <>
          {!writable && (
            <p>
              {base?.status === "published"
                ? "Эта версия неизменяема. Создайте следующий черновик для редактирования."
                : "Для сохранения нужны права управления курсом, заданиями и навыками организации."}
            </p>
          )}
          {base?.status === "published" && base.canApply && (
            <button disabled={busy} onClick={createDraft}>
              Создать следующий черновик
            </button>
          )}
          <div className={styles.actions} aria-label="Режим редактора">
            <button
              disabled={busy}
              aria-pressed={mode === "manual"}
              onClick={() => switchMode("manual")}
            >
              Ручной редактор
            </button>
            <button
              disabled={busy}
              aria-pressed={mode === "json"}
              onClick={() => switchMode("json")}
            >
              JSON
            </button>
            <button
              disabled={busy}
              aria-pressed={mode === "preview"}
              onClick={() => switchMode("preview")}
            >
              Предпросмотр
            </button>
          </div>
          <fieldset disabled={busy || !writable}>
            <legend>Содержимое курса</legend>
            {mode === "manual" && (
              <ManualEditor document={document} edit={edit} existing={!isNew} />
            )}
            {mode === "json" && (
              <>
                <label>
                  Manifest JSON
                  <textarea
                    className={styles.json}
                    value={raw}
                    maxLength={900000}
                    onChange={(e) => {
                      setRaw(e.target.value);
                      changed();
                    }}
                    spellCheck={false}
                  />
                </label>
                <label>
                  Загрузить JSON-файл
                  <input
                    type="file"
                    accept=".json,application/json"
                    onChange={(e) => {
                      void uploadJson(e.target.files?.[0]);
                      e.target.value = "";
                    }}
                  />
                </label>
              </>
            )}
          </fieldset>
          {mode === "preview" && <DraftPreview document={document} />}
          <div className={styles.actions}>
            <button
              disabled={busy || !writable || uncertain}
              onClick={validate}
            >
              Проверить документ
            </button>
            <button
              className={styles.primary}
              disabled={busy || !writable || !checked || uncertain}
              onClick={apply}
            >
              Сохранить черновик
            </button>
            {base?.status === "draft" && (
              <button disabled={busy} onClick={exportDraft}>
                Скачать сохранённый JSON
              </button>
            )}
            <button
              disabled={busy}
              onClick={() => {
                const d = working();
                if (d) downloadManifest(d, d.course.slug);
              }}
            >
              Скачать рабочую копию
            </button>
            {base && (
              <button disabled={busy} onClick={reload}>
                {dirty || uncertain || mode === "json"
                  ? "Отбросить изменения и загрузить сохранённое"
                  : "Обновить сохранённое"}
              </button>
            )}
          </div>
          {checked && (
            <p>
              План:{" "}
              {checked.plan.mode === "create_course"
                ? "создание курса"
                : "замена текущего черновика"}
              ; навыков: {checked.plan.counts.skills}, заданий:{" "}
              {checked.plan.counts.activities}, уроков:{" "}
              {checked.plan.counts.lessons}.
            </p>
          )}
          {base?.status === "draft" && (
            <section className={styles.card}>
              <h2>Публикация</h2>
              <p>
                Проверьте предпросмотр сохранённого черновика. Публикация
                зафиксирует эту версию. Публичное обучение настраивается
                отдельно.
              </p>
              <button
                disabled={
                  busy ||
                  !base.canPublish ||
                  dirty ||
                  mode !== "preview" ||
                  uncertain
                }
                onClick={publish}
              >
                Опубликовать версию {base.versionNumber}
              </button>
            </section>
          )}
        </>
      )}
    </>
  );
}
