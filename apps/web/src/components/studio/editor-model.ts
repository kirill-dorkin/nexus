import { itemAt } from "../../lib/item-at";
import {
  courseManifestV1Schema,
  type CourseManifestV1,
  type ManifestActivity
} from "@platform/contracts";
export function blankCourse(): CourseManifestV1 {
  return {
    schemaVersion: 1,
    course: { slug: "", title: "", description: "" },
    skills: [],
    activities: [],
    lessons: []
  };
}
export function newActivity(
  type: ManifestActivity["type"],
  slug = "",
  skillKeys: string[] = []
): ManifestActivity {
  const base = { slug, title: "", instructions: "", skillKeys };
  if (type === "quiz.short_text")
    return {
      ...base,
      type,
      presentation: { question: "" },
      validation: {
        acceptedAnswers: [""],
        caseSensitive: false,
        explanation: ""
      }
    };
  const presentation = {
    question: "",
    options: [
      { id: "a", text: "" },
      { id: "b", text: "" }
    ]
  };
  return type === "quiz.single_choice"
    ? {
        ...base,
        type,
        presentation,
        validation: { correctOptionId: "a", explanation: "" }
      }
    : {
        ...base,
        type,
        presentation,
        validation: { correctOptionIds: ["a"], explanation: "" }
      };
}
export function parseEditorJson(
  raw: string
):
  | { manifest: CourseManifestV1; issues: never[] }
  | { manifest: null; issues: string[] } {
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return { manifest: null, issues: ["JSON: проверьте синтаксис документа."] };
  }
  const result = courseManifestV1Schema.safeParse(value);
  return result.success
    ? { manifest: result.data, issues: [] }
    : {
        manifest: null,
        issues: result.error.issues.map(
          (i) => `${i.path.map(String).join(".") || "manifest"}: ${i.message}`
        )
      };
}
export function move(items: unknown[], index: number, offset: number): void {
  const target = index + offset;
  if (target < 0 || target >= items.length) return;
  [items[index], items[target]] = [itemAt(items, target), itemAt(items, index)];
}

/** The working copy as a manifest for this course, or the issues that prevent it. */
export function workingManifest(
  source: string,
  savedSlug: string | null
):
  | { manifest: CourseManifestV1; issues: [] }
  | { manifest: null; issues: string[] } {
  const result = parseEditorJson(source);
  if (!result.manifest) return result;
  if (savedSlug !== null && result.manifest.course.slug !== savedSlug)
    return {
      manifest: null,
      issues: ["course.slug: адрес существующего курса нельзя менять."]
    };
  return { manifest: result.manifest, issues: [] };
}

/**
 * Whether a validation plan targets the draft this editor loaded. A mismatch
 * means someone else changed the course since, so saving must not proceed.
 */
export function planMatchesDraft(
  plan: {
    courseId: string | null;
    expectedDraftVersionId: string | null;
    expectedRevision: number;
  },
  saved: {
    status: "draft" | "published";
    versionId: string;
    revision: number;
  } | null,
  isNew: boolean
): boolean {
  const draft = saved?.status === "draft" ? saved : null;
  return (
    plan.expectedDraftVersionId === (draft?.versionId ?? null) &&
    plan.expectedRevision === (draft?.revision ?? 0) &&
    !(isNew && plan.courseId !== null)
  );
}

const maxManifestBytes = 900000;

/** Reads an uploaded manifest file into the JSON editor, refusing oversized files. */
export async function readManifestFile(file: Blob): Promise<
  | { tooLarge: true }
  | {
      tooLarge: false;
      text: string;
      manifest: CourseManifestV1 | null;
      issues: string[];
    }
> {
  if (file.size > maxManifestBytes) return { tooLarge: true };
  const text = await file.text();
  return { tooLarge: false, text, ...parseEditorJson(text) };
}
