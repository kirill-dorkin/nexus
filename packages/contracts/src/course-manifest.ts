import { z } from "zod";

import { resourceSlugSchema, uuidSchema } from "./common";

const title = z.string().trim().min(1).max(200);
const key = z.string().min(1).max(63).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
const youtubeId = /^[A-Za-z0-9_-]{11}$/;

/** Accept locators, never author-supplied iframe markup or arbitrary embed URLs. */
export function normalizeYouTubeVideoId(input: string): string | null {
  const value = input.trim();
  if (youtubeId.test(value)) return value;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password || url.port) return null;
    let id: string | null = null;
    if (url.hostname === "youtu.be") {
      id = /^\/([^/]+)\/?$/.exec(url.pathname)?.[1] ?? null;
    } else if (["youtube.com", "www.youtube.com", "m.youtube.com"].includes(url.hostname)) {
      if (url.pathname === "/watch" && url.searchParams.getAll("v").length === 1) {
        id = url.searchParams.get("v");
      } else {
        id = /^\/(?:embed|shorts)\/([^/]+)\/?$/.exec(url.pathname)?.[1] ?? null;
      }
    }
    return id !== null && youtubeId.test(id) ? id : null;
  } catch {
    return null;
  }
}

export const youtubeVideoIdSchema = z.string().max(2048).transform((value, context) => {
  const id = normalizeYouTubeVideoId(value);
  if (id === null) {
    context.addIssue({ code: "custom", message: "Expected a YouTube video ID or an HTTPS YouTube URL." });
    return z.NEVER;
  }
  return id;
});

export const lessonBlockSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("youtube"), videoId: youtubeVideoIdSchema }).strict(),
  z.object({ type: z.literal("markdown"), markdown: z.string().min(1).max(50000) }).strict(),
  z.object({
    type: z.literal("activity"), activitySlug: resourceSlugSchema,
    title: title.optional(), kind: z.enum(["practice", "homework"]), required: z.boolean()
  }).strict()
]);

export const manifestLessonSchema = z.object({
  slug: resourceSlugSchema, title, summary: z.string().max(5000).default(""),
  /** Optional section name; consecutive lessons with the same chapter are shown as one group. */
  chapter: z.string().trim().min(1).max(80).optional(),
  durationMinutes: z.number().int().min(1).max(1440),
  blocks: z.array(lessonBlockSchema).min(1).max(200)
}).strict();

const option = z.object({ id: key, text: z.string().trim().min(1).max(2000) }).strict();
const choicePresentation = z.object({
  question: z.string().trim().min(1).max(20000), options: z.array(option).min(2).max(50)
}).strict();
const explanation = z.string().max(10000);
const activityBase = {
  slug: resourceSlugSchema, title, instructions: z.string().max(20000).default(""),
  skillKeys: z.array(resourceSlugSchema).min(1).max(50)
};

export const manifestActivitySchema = z.discriminatedUnion("type", [
  z.object({ ...activityBase, type: z.literal("quiz.single_choice"),
    presentation: choicePresentation,
    validation: z.object({ correctOptionId: key, explanation }).strict()
  }).strict(),
  z.object({ ...activityBase, type: z.literal("quiz.multiple_choice"),
    presentation: choicePresentation,
    validation: z.object({ correctOptionIds: z.array(key).min(1).max(50), explanation }).strict()
  }).strict(),
  z.object({ ...activityBase, type: z.literal("quiz.short_text"),
    presentation: z.object({ question: z.string().trim().min(1).max(20000) }).strict(),
    validation: z.object({
      acceptedAnswers: z.array(z.string().trim().min(1).max(2000)).min(1).max(50),
      caseSensitive: z.boolean(), explanation
    }).strict()
  }).strict()
]);

/** Array order is canonical position; no UUID/actor/organization authority in a manifest. */
export const courseManifestV1Schema = z.object({
  schemaVersion: z.literal(1),
  course: z.object({ slug: resourceSlugSchema, title, description: z.string().max(5000).default("") }).strict(),
  skills: z.array(z.object({ key: resourceSlugSchema, title, description: z.string().max(5000).default("") }).strict()).max(500),
  activities: z.array(manifestActivitySchema).max(1000),
  lessons: z.array(manifestLessonSchema).min(1).max(200)
}).strict().superRefine((manifest, context) => {
  const issue = (path: (string | number)[], message: string) => context.addIssue({ code: "custom", path, message });
  function unique(values: string[], path: (string | number)[], field?: string) {
    const seen = new Set<string>();
    values.forEach((value, index) => {
      if (seen.has(value)) issue([...path, index, ...(field ? [field] : [])], `Duplicate ${field ?? "reference"}: ${value}.`);
      seen.add(value);
    });
    return seen;
  }
  const skills = unique(manifest.skills.map((s) => s.key), ["skills"], "key");
  const activities = unique(manifest.activities.map((a) => a.slug), ["activities"], "slug");
  unique(manifest.lessons.map((l) => l.slug), ["lessons"], "slug");
  manifest.activities.forEach((activity, index) => {
    unique(activity.skillKeys, ["activities", index, "skillKeys"]);
    activity.skillKeys.forEach((skill, position) => {
      if (!skills.has(skill)) issue(["activities", index, "skillKeys", position], `Unknown course skill: ${skill}.`);
    });
    if (activity.type !== "quiz.short_text") {
      const options = unique(activity.presentation.options.map((o) => o.id), ["activities", index, "presentation", "options"], "id");
      if (activity.type === "quiz.single_choice") {
        if (!options.has(activity.validation.correctOptionId)) issue(["activities", index, "validation", "correctOptionId"], "Correct option must exist in presentation.options.");
      } else {
        unique(activity.validation.correctOptionIds, ["activities", index, "validation", "correctOptionIds"]);
        activity.validation.correctOptionIds.forEach((id, position) => {
          if (!options.has(id)) issue(["activities", index, "validation", "correctOptionIds", position], "Correct option must exist in presentation.options.");
        });
      }
    }
  });
  manifest.lessons.forEach((lesson, index) => {
    lesson.blocks.forEach((block, position) => {
      if (block.type === "activity" && !activities.has(block.activitySlug)) issue(["lessons", index, "blocks", position, "activitySlug"], `Unknown course activity: ${block.activitySlug}.`);
    });
  });
});

export const applyCourseManifestRequestSchema = z.object({
  manifest: courseManifestV1Schema,
  expectedDraftVersionId: uuidSchema.nullable(),
  expectedRevision: z.number().int().min(0)
}).strict();

export type CourseManifestV1 = z.infer<typeof courseManifestV1Schema>;
export type ManifestActivity = z.infer<typeof manifestActivitySchema>;
export type ManifestLesson = z.infer<typeof manifestLessonSchema>;
export type LessonBlock = z.infer<typeof lessonBlockSchema>;
export type ApplyCourseManifestRequest = z.infer<typeof applyCourseManifestRequestSchema>;
export type CourseManifestPlan = {
  mode: "create_course" | "replace_draft" | "create_draft";
  courseId: string | null;
  expectedDraftVersionId: string | null;
  expectedRevision: number;
  counts: { skills: number; activities: number; lessons: number };
};
