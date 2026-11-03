import type { CourseManifestV1, ManifestActivity } from "@platform/contracts";
import { itemAt } from "../../lib/item-at";
import { newActivity } from "./editor-model";

/*
 * Document commands. Each mutates the working copy that `edit` hands it
 * (already a clone) and keeps cross-references consistent: a renamed skill,
 * activity or option is renamed wherever it is used.
 */
type Doc = CourseManifestV1;
type ActivityType = ManifestActivity["type"];
type LessonBlock = Doc["lessons"][number]["blocks"][number];

export function addSkill(d: Doc): void {
  d.skills.push({ key: "", title: "", description: "" });
}

export function renameSkill(d: Doc, index: number, key: string): void {
  const skill = itemAt(d.skills, index);
  const old = skill.key;
  skill.key = key;
  for (const activity of d.activities)
    activity.skillKeys = activity.skillKeys.map((k) => (k === old ? key : k));
}

/** Removes a skill and unlinks it from every activity. */
export function removeSkill(d: Doc, index: number): void {
  const [removed] = d.skills.splice(index, 1);
  if (!removed) return;
  for (const activity of d.activities)
    activity.skillKeys = activity.skillKeys.filter((k) => k !== removed.key);
}

/** A new single-choice activity, linked to the first skill when there is one. */
export function addActivity(d: Doc): void {
  const first = d.skills[0];
  d.activities.push(
    newActivity("quiz.single_choice", "", first ? [first.key] : [])
  );
}

export function renameActivity(d: Doc, index: number, slug: string): void {
  const activity = itemAt(d.activities, index);
  const old = activity.slug;
  activity.slug = slug;
  for (const lesson of d.lessons)
    for (const block of lesson.blocks)
      if (block.type === "activity" && block.activitySlug === old)
        block.activitySlug = slug;
}

export function setActivitySkill(
  d: Doc,
  index: number,
  key: string,
  linked: boolean
): void {
  const activity = itemAt(d.activities, index);
  activity.skillKeys = linked
    ? [...activity.skillKeys, key]
    : activity.skillKeys.filter((k) => k !== key);
}

/** Switches the question type, keeping everything the new type can hold. */
export function changeActivityType(
  d: Doc,
  index: number,
  type: ActivityType
): void {
  const old = itemAt(d.activities, index);
  const next = newActivity(type, old.slug, old.skillKeys);
  next.title = old.title;
  next.instructions = old.instructions;
  if (old.type !== "quiz.short_text" && next.type !== "quiz.short_text") {
    next.presentation = structuredClone(old.presentation);
    if (next.type === "quiz.single_choice")
      next.validation.correctOptionId =
        old.type === "quiz.single_choice"
          ? old.validation.correctOptionId
          : (old.validation.correctOptionIds[0] ??
            old.presentation.options[0]?.id ??
            "");
    else
      next.validation.correctOptionIds =
        old.type === "quiz.multiple_choice"
          ? [...old.validation.correctOptionIds]
          : [old.validation.correctOptionId];
  }
  next.presentation.question = old.presentation.question;
  next.validation.explanation = old.validation.explanation;
  d.activities[index] = next;
}

export function addOption(d: Doc, index: number): void {
  const activity = itemAt(d.activities, index);
  if (activity.type !== "quiz.short_text")
    activity.presentation.options.push({ id: "", text: "" });
}

export function renameOption(
  d: Doc,
  index: number,
  option: number,
  id: string
): void {
  const activity = itemAt(d.activities, index);
  if (activity.type === "quiz.short_text") return;
  const choice = itemAt(activity.presentation.options, option);
  const old = choice.id;
  choice.id = id;
  if (activity.type === "quiz.single_choice") {
    if (activity.validation.correctOptionId === old)
      activity.validation.correctOptionId = id;
  } else
    activity.validation.correctOptionIds =
      activity.validation.correctOptionIds.map((k) => (k === old ? id : k));
}

/** Removes an option; a removed correct answer stops being the answer. */
export function removeOption(d: Doc, index: number, option: number): void {
  const activity = itemAt(d.activities, index);
  if (activity.type === "quiz.short_text") return;
  const [removed] = activity.presentation.options.splice(option, 1);
  if (!removed) return;
  if (activity.type === "quiz.single_choice") {
    if (activity.validation.correctOptionId === removed.id)
      activity.validation.correctOptionId =
        activity.presentation.options[0]?.id ?? "";
  } else
    activity.validation.correctOptionIds =
      activity.validation.correctOptionIds.filter((k) => k !== removed.id);
}

export function setCorrectOption(
  d: Doc,
  index: number,
  optionId: string,
  correct: boolean
): void {
  const activity = itemAt(d.activities, index);
  if (activity.type === "quiz.single_choice")
    activity.validation.correctOptionId = optionId;
  else if (activity.type === "quiz.multiple_choice")
    activity.validation.correctOptionIds = correct
      ? [...activity.validation.correctOptionIds, optionId]
      : activity.validation.correctOptionIds.filter((k) => k !== optionId);
}

export function addLesson(d: Doc): void {
  d.lessons.push({
    slug: "",
    title: "",
    summary: "",
    durationMinutes: 10,
    blocks: []
  });
}

/** An empty block of `type`; a practice block shows the first activity. */
export function addBlock(
  d: Doc,
  lesson: number,
  type: LessonBlock["type"]
): void {
  const block: LessonBlock =
    type === "youtube"
      ? { type, videoId: "" }
      : type === "markdown"
        ? { type, markdown: "" }
        : {
            type,
            activitySlug: d.activities[0]?.slug ?? "",
            kind: "practice",
            required: true
          };
  itemAt(d.lessons, lesson).blocks.push(block);
}

/** The optional chapter; blank text removes it. */
export function setChapter(d: Doc, lesson: number, chapter: string): void {
  const target = itemAt(d.lessons, lesson);
  if (chapter.trim()) target.chapter = chapter;
  else delete target.chapter;
}

/** Changes one block in place when it has the expected type. */
export function updateBlock<T extends LessonBlock["type"]>(
  d: Doc,
  lesson: number,
  block: number,
  type: T,
  change: (block: Extract<LessonBlock, { type: T }>) => void
): void {
  const target = itemAt(itemAt(d.lessons, lesson).blocks, block);
  if (target.type === type) change(target as Extract<LessonBlock, { type: T }>);
}
