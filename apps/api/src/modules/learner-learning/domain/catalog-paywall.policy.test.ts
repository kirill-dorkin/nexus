import { describe, expect, it } from "vitest";

import { isFreeLesson } from "./catalog-paywall.policy";

const lessons = [
  { slug: "why-python", chapter: "Старт Python" },
  { slug: "install-run", chapter: "Старт Python" },
  { slug: "variables", chapter: "Переменные и типы" },
  { slug: "strings", chapter: "Переменные и типы" }
];

describe("catalog paywall policy (ADR-0087)", () => {
  it("frees every lesson of the first chapter and nothing after it", () => {
    expect(isFreeLesson(lessons, "why-python")).toBe(true);
    expect(isFreeLesson(lessons, "install-run")).toBe(true);
    expect(isFreeLesson(lessons, "variables")).toBe(false);
    expect(isFreeLesson(lessons, "strings")).toBe(false);
  });

  it("frees a whole course without chapters and nothing unknown", () => {
    const flat = lessons.map((lesson) => ({ ...lesson, chapter: null }));
    expect(isFreeLesson(flat, "strings")).toBe(true);
    expect(isFreeLesson(lessons, "missing")).toBe(false);
    expect(isFreeLesson([], "why-python")).toBe(false);
  });
});
