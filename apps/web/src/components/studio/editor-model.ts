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
