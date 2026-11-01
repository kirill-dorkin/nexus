import { describe, expect, it } from "vitest";
import {
  publicLessonBlockSchema,
  publicLearningCourseSchema
} from "./public-learning";
const activity = {
  type: "quiz.single_choice",
  slug: "check",
  title: "Check",
  instructions: "",
  question: "Which?",
  options: [
    { id: "a", text: "A" },
    { id: "b", text: "B" }
  ]
};
describe("strict public learning disclosure contracts", () => {
  it("accepts authoring's one-character option identity without a private validator binding", () => {
    expect(
      publicLessonBlockSchema.parse({
        type: "activity",
        title: null,
        kind: "practice",
        required: true,
        activity
      })
    ).toMatchObject({ activity: { options: [{ id: "a" }, { id: "b" }] } });
  });
  it.each([
    "correctOptionId",
    "correctOptionIds",
    "acceptedAnswers",
    "explanation",
    "validation",
    "config",
    "validatorKey",
    "activityVersionId"
  ])("rejects accidentally expanded Activity field %s", (field) => {
    expect(
      publicLessonBlockSchema.safeParse({
        type: "activity",
        title: null,
        kind: "practice",
        required: true,
        activity: { ...activity, [field]: "private" }
      }).success
    ).toBe(false);
  });
  it("requires a canonical video ID, not a URL or author iframe", () => {
    expect(
      publicLessonBlockSchema.safeParse({
        type: "youtube",
        videoId: "https://youtu.be/aqz-KE-bpKQ"
      }).success
    ).toBe(false);
    expect(
      publicLessonBlockSchema.safeParse({
        type: "youtube",
        videoId: "aqz-KE-bpKQ",
        iframe: "<iframe>"
      }).success
    ).toBe(false);
  });
  it("rejects internal metadata and requires at least one real lesson", () => {
    const value = {
      organization: { slug: "academy", name: "Academy" },
      offering: { slug: "course", name: "Course" },
      course: {
        slug: "course",
        title: "Course",
        description: "",
        lessons: [
          { slug: "intro", title: "Intro", summary: "", durationMinutes: 10 }
        ]
      }
    };
    expect(publicLearningCourseSchema.safeParse(value).success).toBe(true);
    expect(
      publicLearningCourseSchema.safeParse({
        ...value,
        organization: { ...value.organization, organizationId: "private" }
      }).success
    ).toBe(false);
    expect(
      publicLearningCourseSchema.safeParse({
        ...value,
        course: { ...value.course, lessons: [] }
      }).success
    ).toBe(false);
  });
});
