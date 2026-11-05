import { describe, expect, it } from "vitest";

import {
  createFeedbackReportRequestSchema,
  updateFeedbackReportRequestSchema
} from "./feedback";
import { feedbackPageContext } from "./feedback-page";

describe("feedback page context (ADR-0085)", () => {
  it.each([
    ["/", "/", null, null],
    ["/courses", "/courses", null, null],
    ["/courses/html", "/courses/[course]", "html", null],
    [
      "/courses/html/first-tag",
      "/courses/[course]/[lesson]",
      "html",
      "first-tag"
    ],
    [
      "/courses/html/first-tag/",
      "/courses/[course]/[lesson]",
      "html",
      "first-tag"
    ],
    [
      "/learn/academy/html-free",
      "/learn/[organization]/[offering]",
      null,
      null
    ],
    [
      "/learn/academy/html-free/first-tag",
      "/learn/[organization]/[offering]/[lesson]",
      null,
      "first-tag"
    ],
    ["/characters", "/characters", null, null],
    ["/characters/html", "/characters/[character]", null, null],
    ["/map", "/map", null, null],
    ["/me/learning", "/me/learning", null, null],
    ["/blog/first-post", "/blog/[slug]", null, null],
    ["/studio/abc", "other", null, null],
    ["/courses/HTML/first-tag", "other", null, null],
    ["/courses/html/first%20tag", "other", null, null],
    ["/courses/html?x=1", "other", null, null],
    ["courses/html", "other", null, null],
    ["/a/b/c/d/e", "other", null, null]
  ])("%s → %s", (path, route, courseSlug, lessonSlug) => {
    expect(feedbackPageContext(path)).toEqual({
      route,
      courseSlug,
      lessonSlug
    });
  });
});

describe("feedback contracts", () => {
  const base = {
    organizationSlug: "academy",
    kind: "problem",
    text: "  Видео не запускается  ",
    path: "/courses/html/first-tag"
  };

  it("trims the text and keeps only allowed fields", () => {
    expect(createFeedbackReportRequestSchema.parse(base).text).toBe(
      "Видео не запускается"
    );
    expect(
      createFeedbackReportRequestSchema.safeParse({ ...base, url: "/x" })
        .success
    ).toBe(false);
  });

  it("allows expected and actual for problems only", () => {
    expect(
      createFeedbackReportRequestSchema.safeParse({
        ...base,
        kind: "unclear",
        actual: "Ничего"
      }).success
    ).toBe(false);
  });

  it("needs something to change and allows clearing the note", () => {
    expect(updateFeedbackReportRequestSchema.safeParse({}).success).toBe(false);
    expect(
      updateFeedbackReportRequestSchema.parse({ ownerNote: null })
    ).toEqual({ ownerNote: null });
  });
});
