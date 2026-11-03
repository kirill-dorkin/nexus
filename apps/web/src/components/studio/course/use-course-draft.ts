"use client";
import { useEffect, useState } from "react";
import {
  courseManifestApplyResultSchema,
  courseManifestPlanSchema,
  courseManifestV1Schema,
  studioCourseListSchema,
  studioDraftSchema,
  type CourseManifestPlan,
  type CourseManifestV1,
  type StudioDraft
} from "@platform/contracts";
import {
  blankCourse,
  planMatchesDraft,
  readManifestFile,
  workingManifest
} from "../editor-model";
import {
  downloadManifest,
  errorMessage,
  studioRequest,
  StudioError
} from "../studio-api";
import { useOperation } from "./use-operation";

export type EditorMode = "manual" | "json" | "preview";
export type CheckedPlan = {
  document: CourseManifestV1;
  plan: CourseManifestPlan;
};

/**
 * The course editor's state machine: the saved draft (`base`), the working
 * copy, validation and the revision-fenced save and publish commands.
 */
export function useCourseDraft({
  organizationId: org,
  courseId: routeCourse,
  onCreated
}: {
  organizationId: string;
  courseId: string;
  onCreated: (courseId: string) => void;
}) {
  const isNew = routeCourse === "new";
  const path = `organizations/${org}`;
  const coursePath = `${path}/studio/courses/${routeCourse}`;
  const [base, setBase] = useState<StudioDraft | null>(null),
    [document, setDocument] = useState<CourseManifestV1>(blankCourse),
    [raw, setRaw] = useState(""),
    [mode, setMode] = useState<EditorMode>("manual"),
    [checked, setChecked] = useState<CheckedPlan | null>(null),
    [issues, setIssues] = useState<string[]>([]),
    [ready, setReady] = useState(false),
    [login, setLogin] = useState(false),
    [canCreate, setCanCreate] = useState(false),
    [uncertain, setUncertain] = useState(false);
  const {
    busy,
    error,
    message,
    setError,
    setMessage,
    run: operation
  } = useOperation((e) => {
    if (e instanceof StudioError && e.status === 401) setLogin(true);
  });

  const dirty =
    base !== null && JSON.stringify(document) !== JSON.stringify(base.manifest);
  const unsaved =
    dirty ||
    (mode === "json" && raw !== JSON.stringify(document, null, 2)) ||
    (isNew && JSON.stringify(document) !== JSON.stringify(blankCourse()));
  const writable =
    ready && (isNew ? canCreate : base?.status === "draft" && base.canApply);
  const publishDisabled =
    busy || !base?.canPublish || dirty || mode !== "preview" || uncertain;

  function changed() {
    setChecked(null);
    setIssues([]);
    setMessage(null);
  }
  function install(value: StudioDraft) {
    setBase(value);
    setDocument(value.manifest);
    setRaw(JSON.stringify(value.manifest, null, 2));
    setReady(true);
    setUncertain(false);
    setChecked(null);
    setIssues([]);
  }
  async function loadSaved() {
    install(studioDraftSchema.parse(await studioRequest(coursePath)));
  }

  useEffect(() => {
    let cancelled = false;
    studioRequest(isNew ? `${path}/studio/courses` : coursePath)
      .then((value) => {
        if (cancelled) return;
        if (isNew) {
          setCanCreate(studioCourseListSchema.parse(value).canCreate);
          setReady(true);
        } else install(studioDraftSchema.parse(value));
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setError(errorMessage(e));
        setLogin(e instanceof StudioError && e.status === 401);
      });
    return () => {
      cancelled = true;
    };
  }, [isNew, path, coursePath, setError]);

  function edit(change: (d: CourseManifestV1) => void) {
    setDocument((old) => {
      const next = structuredClone(old);
      change(next);
      return next;
    });
    changed();
  }
  function setJson(text: string) {
    setRaw(text);
    changed();
  }
  /** The working copy if it is a valid manifest for this course; otherwise lists issues. */
  function working(): CourseManifestV1 | null {
    const result = workingManifest(
      mode === "json" ? raw : JSON.stringify(document),
      base?.slug ?? null
    );
    setIssues(result.issues);
    return result.manifest;
  }
  function switchMode(next: EditorMode) {
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
  /** Fails closed as "uncertain" when a command may or may not have reached the server. */
  async function fenced(fn: () => Promise<void>) {
    try {
      await fn();
    } catch (e) {
      setUncertain(true);
      throw e;
    }
  }

  async function validate() {
    const d = working();
    if (!d) return;
    await operation(async () => {
      const plan = courseManifestPlanSchema.parse(
        await studioRequest(`${path}/courses/manifest/validate`, d)
      );
      if (!planMatchesDraft(plan, base, isNew)) {
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
    await operation(() =>
      fenced(async () => {
        const result = courseManifestApplyResultSchema.parse(
          await studioRequest(`${path}/courses/manifest/apply`, {
            manifest: candidate.document,
            expectedDraftVersionId: candidate.plan.expectedDraftVersionId,
            expectedRevision: candidate.plan.expectedRevision
          })
        );
        if (isNew) {
          onCreated(result.courseId);
          return;
        }
        await loadSaved();
        setMode("manual");
        setMessage("Черновик сохранён.");
      })
    );
  }
  async function reload() {
    await operation(async () => {
      await loadSaved();
      setMode("manual");
      setMessage("Загружен актуальный черновик.");
    });
  }
  async function createDraft() {
    await operation(async () => {
      await studioRequest(`${coursePath}/draft`, {});
      await loadSaved();
      setMode("manual");
      setMessage("Создан следующий черновик.");
    });
  }
  async function publish() {
    if (!base || dirty || mode === "json" || uncertain) return;
    await operation(() =>
      fenced(async () => {
        await studioRequest(`${coursePath}/publish`, {
          draftVersionId: base.versionId,
          expectedRevision: base.revision
        });
        await loadSaved();
        setMessage(
          "Версия опубликована. Новые изменения потребуют следующего черновика."
        );
      })
    );
  }
  async function exportSaved() {
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
  function exportWorking() {
    const d = working();
    if (d) downloadManifest(d, d.course.slug);
  }
  async function uploadJson(file: File | undefined) {
    if (!file) return;
    const read = await readManifestFile(file);
    if (read.tooLarge) {
      setError("JSON-файл должен быть не больше 900 КБ.");
      return;
    }
    setRaw(read.text);
    setMode("json");
    changed();
    setIssues(read.issues);
    if (read.manifest) setDocument(read.manifest);
  }

  return {
    isNew,
    base,
    document,
    raw,
    mode,
    checked,
    issues,
    error,
    message,
    ready,
    busy,
    login,
    uncertain,
    dirty,
    unsaved,
    writable,
    publishDisabled,
    edit,
    setJson,
    switchMode,
    validate,
    apply,
    reload,
    createDraft,
    publish,
    exportSaved,
    exportWorking,
    uploadJson
  };
}

export type CourseDraft = ReturnType<typeof useCourseDraft>;
