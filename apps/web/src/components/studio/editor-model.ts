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
export function move<T>(items: T[], index: number, offset: number): void {
  const target = index + offset;
  if (target < 0 || target >= items.length) return;
  [items[index], items[target]] = [items[target]!, items[index]!];
}

/** Only changes the in-memory manifest. Server validation and revision-fenced apply stay authoritative. */
export function appendLesson(document: CourseManifestV1): number {
  if (document.lessons.length >= 200) throw new Error("Достигнут предел уроков.");
  const used = new Set(document.lessons.map((lesson) => lesson.slug));
  let number = 1;
  while (used.has("urok-" + number)) number++;
  document.lessons.push({
    slug: "urok-" + number,
    title: "Урок " + (document.lessons.length + 1),
    summary: "",
    durationMinutes: 10,
    blocks: []
  });
  return document.lessons.length - 1;
}

/** A new quiz is linked only to the selected Lesson. Existing shared Activities are never deleted. */
export function appendQuizToLesson(document: CourseManifestV1, lessonIndex: number): string {
  const lesson = document.lessons[lessonIndex];
  if (!lesson) throw new Error("Урок не найден.");
  if (!document.skills[0]) throw new Error("Для проверяемого задания сначала нужен навык.");
  if (document.activities.length >= 1000 || lesson.blocks.length >= 200)
    throw new Error("Достигнут предел заданий или блоков.");
  const used = new Set(document.activities.map((activity) => activity.slug));
  let number = 1;
  while (used.has("zadanie-" + number)) number++;
  const slug = "zadanie-" + number;
  const quiz = newActivity("quiz.single_choice", slug, [document.skills[0].key]);
  quiz.title = "Новый вопрос";
  document.activities.push(quiz);
  lesson.blocks.push({ type: "activity", activitySlug: slug, kind: "practice", required: true });
  return slug;
}
