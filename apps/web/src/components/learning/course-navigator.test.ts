import { describe, expect, it } from "vitest";
import { matchesQuery } from "./course-navigator";

describe("program search", () => {
  const item = {
    title: "Помощники итераторов",
    chapter: "Массивы и итераторы полностью"
  };
  it("matches every word, ignoring case, ё and word order", () => {
    expect(matchesQuery(item, "ИТЕРАТОР помощ")).toBe(true);
    expect(matchesQuery({ title: "Ёлка" }, "елка")).toBe(true);
    expect(matchesQuery(item, "итератор строки")).toBe(false);
  });
  it("finds lessons by their chapter name too, and an empty query matches all", () => {
    expect(matchesQuery(item, "массивы")).toBe(true);
    expect(matchesQuery(item, "   ")).toBe(true);
  });
});
