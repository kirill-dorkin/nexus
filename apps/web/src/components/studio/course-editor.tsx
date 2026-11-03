"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  courseManifestApplyResultSchema,
  courseManifestPlanSchema,
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
import {
  downloadManifest,
  downloadManifestText,
  errorMessage,
  studioRequest,
  StudioError
} from "./studio-api";
import {
  Alert,
  Badge,
  Button,
  Dialog,
  Disclosure,
  EmptyState,
  Eyebrow,
  Field,
  Heading,
  Input,
  Skeleton,
  Stack,
  Text,
  Textarea,
  buttonClass
} from "@platform/ui";
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
    [uncertain, setUncertain] = useState(false),
    [publishOpen, setPublishOpen] = useState(false),
    [discardOpen, setDiscardOpen] = useState(false),
    [leaveHref, setLeaveHref] = useState<string | null>(null);
  const inFlight = useRef(false);
  const dirty =
    base !== null && JSON.stringify(document) !== JSON.stringify(base.manifest);
  const unsaved =
    dirty ||
    (mode === "json" && raw !== JSON.stringify(document, null, 2)) ||
    (isNew && JSON.stringify(document) !== JSON.stringify(blankCourse()));
  const leaveBlocked = unsaved || uncertain;
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
      .catch((e: unknown) => {
        if (!cancelled) {
          setError(errorMessage(e));
          setLogin(e instanceof StudioError && e.status === 401);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [isNew, path, routeCourse]);
  useEffect(() => {
    if (!leaveBlocked) return;
    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [leaveBlocked]);
  useEffect(() => {
    if (!leaveBlocked || !ready) return;
    const intercept = (event: MouseEvent) => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      )
        return;
      const anchor =
        event.target instanceof Element
          ? event.target.closest<HTMLAnchorElement>("a[href]")
          : null;
      if (
        !anchor ||
        anchor.hasAttribute("download") ||
        (anchor.target && anchor.target !== "_self")
      )
        return;
      const destination = new URL(anchor.href, window.location.href);
      if (
        destination.origin !== window.location.origin ||
        (destination.pathname === window.location.pathname &&
          destination.search === window.location.search)
      )
        return;
      event.preventDefault();
      event.stopImmediatePropagation();
      setLeaveHref(
        destination.pathname + destination.search + destination.hash
      );
    };
    window.document.addEventListener("click", intercept, true);
    return () => window.document.removeEventListener("click", intercept, true);
  }, [leaveBlocked, ready]);
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
      const plan = courseManifestPlanSchema.parse(
        await studioRequest(`${path}/courses/manifest/validate`, d)
      );
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
        const result = courseManifestApplyResultSchema.parse(
          await studioRequest(`${path}/courses/manifest/apply`, {
            manifest: candidate.document,
            expectedDraftVersionId: candidate.plan.expectedDraftVersionId,
            expectedRevision: candidate.plan.expectedRevision
          })
        );
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
  const publishDisabled =
    busy || !base?.canPublish || dirty || mode !== "preview" || uncertain;
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
                {dirty
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
            {issues.map((i, k) => (
              <li key={k}>{i}</li>
            ))}
          </ul>
        </Alert>
      )}
      {message && (
        <Alert tone="success" role="status" className={styles.notice}>
          {message}
        </Alert>
      )}
      {login ? (
        <EmptyState
          title="Войдите в авторскую среду"
          action={
            <Link className={buttonClass()} href={learningLoginUrl(returnTo)}>
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
          {!writable && (
            <Alert tone="neutral" className={styles.notice}>
              {base?.status === "published"
                ? "Эта версия неизменяема. Создайте следующий черновик для редактирования."
                : "Для сохранения нужны права управления курсом, заданиями и навыками организации."}
            </Alert>
          )}
          {base?.status === "published" && base.canApply && (
            <Button variant="secondary" disabled={busy} onClick={createDraft}>
              Создать следующий черновик
            </Button>
          )}
          <div className={styles.toolbar} id="studio-editor-actions">
            <div
              className={styles.modeGroup}
              role="group"
              aria-label="Режим редактора"
            >
              {(
                [
                  ["manual", "Ручной редактор"],
                  ["json", "JSON"],
                  ["preview", "Предпросмотр"]
                ] as const
              ).map(([value, label]) => (
                <Button
                  key={value}
                  variant="ghost"
                  disabled={busy}
                  aria-pressed={mode === value}
                  onClick={() => switchMode(value)}
                >
                  {label}
                </Button>
              ))}
            </div>
            <div className={styles.actions}>
              <Button
                variant="secondary"
                disabled={busy || !writable || uncertain}
                onClick={validate}
              >
                Проверить документ
              </Button>
              <Button
                disabled={busy || !writable || !checked || uncertain}
                onClick={apply}
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
          <div className={styles.editorLayout}>
            <aside className={styles.editorRail}>
              {mode === "manual" ? (
                <nav aria-label="Разделы содержимого курса">
                  <Text muted size="sm">
                    Содержимое
                  </Text>
                  {[
                    ["course", "Курс", null],
                    ["skills", "Навыки", document.skills.length],
                    ["activities", "Задания", document.activities.length],
                    ["lessons", "Уроки", document.lessons.length]
                  ].map(([id, label, count]) => (
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
            <div className={styles.editorBody}>
              {mode !== "preview" && (
                <fieldset
                  disabled={busy || !writable}
                  className={styles.contentFieldset}
                >
                  <legend className={styles.srOnly}>Содержимое курса</legend>
                  {mode === "manual" && (
                    <ManualEditor
                      document={document}
                      edit={edit}
                      existing={!isNew}
                    />
                  )}
                  {mode === "json" && (
                    <section className={styles.jsonEditor}>
                      <Heading level={2} size="section">
                        Документ курса
                      </Heading>
                      <Field
                        htmlFor="studio-manifest-json"
                        label="Manifest JSON"
                      >
                        <Textarea
                          id="studio-manifest-json"
                          className={styles.json}
                          value={raw}
                          maxLength={900000}
                          onChange={(e) => {
                            setRaw(e.target.value);
                            changed();
                          }}
                          spellCheck={false}
                        />
                      </Field>
                      <Field
                        htmlFor="studio-json-file"
                        label="Загрузить JSON-файл"
                      >
                        <Input
                          id="studio-json-file"
                          type="file"
                          accept=".json,application/json"
                          onChange={(e) => {
                            void uploadJson(e.target.files?.[0]);
                            e.target.value = "";
                          }}
                        />
                      </Field>
                      <Text muted size="sm">
                        До 900 КБ. Загрузка файла меняет рабочую копию;
                        сохранение на сервер выполняется отдельно.
                      </Text>
                    </section>
                  )}
                </fieldset>
              )}
              {mode === "preview" && <DraftPreview document={document} />}
              {checked && (
                <Alert tone="neutral" className={styles.notice}>
                  План:{" "}
                  {checked.plan.mode === "create_course"
                    ? "создание курса"
                    : "замена текущего черновика"}
                  ; навыков: {checked.plan.counts.skills}, заданий:{" "}
                  {checked.plan.counts.activities}, уроков:{" "}
                  {checked.plan.counts.lessons}.
                </Alert>
              )}
              <Disclosure
                summary="Копии и сохранённая версия"
                className={styles.fileActions ?? ""}
                {...(uncertain ? { open: true } : {})}
              >
                <Text muted size="sm">
                  Рабочая копия содержит текущие правки. Сохранённый JSON
                  соответствует загруженной версии на сервере.
                </Text>
                <div className={styles.actions}>
                  {base?.status === "draft" && (
                    <Button
                      variant="secondary"
                      disabled={busy}
                      onClick={exportDraft}
                    >
                      Скачать сохранённый JSON
                    </Button>
                  )}
                  <Button
                    variant="secondary"
                    disabled={busy}
                    onClick={() => {
                      const d = working();
                      if (d) downloadManifest(d, d.course.slug);
                    }}
                  >
                    Скачать рабочую копию
                  </Button>
                  {base && (
                    <Button
                      variant="ghost"
                      disabled={busy}
                      onClick={() => {
                        if (unsaved || uncertain) setDiscardOpen(true);
                        else void reload();
                      }}
                    >
                      {dirty || uncertain || mode === "json"
                        ? "Отбросить изменения и загрузить сохранённое"
                        : "Обновить сохранённое"}
                    </Button>
                  )}
                </div>
              </Disclosure>
              <a
                className={styles.returnToActions}
                href="#studio-editor-actions"
              >
                К проверке и сохранению ↑
              </a>
              {base?.status === "draft" && (
                <section
                  className={styles.publication}
                  aria-labelledby="studio-publication-title"
                >
                  <div>
                    <Heading
                      level={2}
                      size="section"
                      id="studio-publication-title"
                    >
                      Публикация
                    </Heading>
                    <Text muted>
                      Проверьте предпросмотр сохранённого черновика. Публикация
                      зафиксирует эту версию. Публичное обучение настраивается
                      отдельно.
                    </Text>
                    {publishDisabled && !busy && (
                      <Text muted size="sm">
                        {!base.canPublish
                          ? "У вас нет права публикации этой версии."
                          : uncertain
                            ? "Сначала загрузите актуальный черновик."
                            : dirty
                              ? "Сначала проверьте и сохраните изменения."
                              : mode !== "preview"
                                ? "Откройте предпросмотр, чтобы проверить сохранённую версию."
                                : "Публикация сейчас недоступна."}
                      </Text>
                    )}
                  </div>
                  <Button
                    variant="secondary"
                    disabled={publishDisabled}
                    onClick={() => setPublishOpen(true)}
                  >
                    Опубликовать версию {base.versionNumber}
                  </Button>
                </section>
              )}
            </div>
          </div>
          <Dialog
            open={discardOpen || leaveHref !== null}
            onDismiss={() => {
              setDiscardOpen(false);
              setLeaveHref(null);
            }}
            aria-labelledby="studio-discard-title"
            aria-describedby="studio-discard-description"
            className={styles.confirmation}
          >
            <Eyebrow>Несохранённая работа</Eyebrow>
            <Heading level={2} size="section" id="studio-discard-title">
              {leaveHref ? "Выйти из редактора?" : "Отбросить текущие правки?"}
            </Heading>
            <Text id="studio-discard-description">
              Текущая рабочая копия будет потеряна. Перед продолжением можно
              скачать её; сохранённая версия на сервере останется без изменений.
            </Text>
            <div className={styles.actions}>
              <Button
                variant="secondary"
                // A destructive confirmation opens on the safe choice (WAI-ARIA APG).
                // eslint-disable-next-line jsx-a11y/no-autofocus
                autoFocus
                onClick={() => {
                  setDiscardOpen(false);
                  setLeaveHref(null);
                }}
              >
                Остаться в редакторе
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  if (mode === "json") {
                    downloadManifestText(raw, document.course.slug);
                  } else downloadManifest(document, document.course.slug);
                }}
              >
                Скачать рабочую копию
              </Button>
              <Button
                onClick={() => {
                  const destination = leaveHref;
                  setDiscardOpen(false);
                  setLeaveHref(null);
                  if (destination) router.push(destination);
                  else void reload();
                }}
              >
                {leaveHref ? "Выйти без сохранения" : "Отбросить и загрузить"}
              </Button>
            </div>
          </Dialog>
          <Dialog
            open={publishOpen}
            onDismiss={() => setPublishOpen(false)}
            aria-labelledby="studio-publish-title"
            aria-describedby="studio-publish-description"
            className={styles.confirmation}
          >
            <Eyebrow>Публикация курса</Eyebrow>
            <Heading level={2} size="section" id="studio-publish-title">
              Зафиксировать версию {base?.versionNumber}?
            </Heading>
            <Text id="studio-publish-description">
              Будет опубликован сохранённый черновик «
              {base?.manifest.course.title}». Эту версию нельзя изменить;
              дальнейшие правки потребуют нового черновика.
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
                onClick={() => setPublishOpen(false)}
              >
                Отмена
              </Button>
              <Button
                disabled={publishDisabled}
                onClick={() => {
                  setPublishOpen(false);
                  void publish();
                }}
              >
                Подтвердить публикацию
              </Button>
            </div>
          </Dialog>
        </>
      )}
    </>
  );
}
