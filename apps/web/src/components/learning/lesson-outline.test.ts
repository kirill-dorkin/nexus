import { describe, expect, it } from "vitest";
import { groupByChapter } from "./lesson-outline";

const lesson = (slug: string, chapter?: string) => ({ slug, title: slug, summary: "", durationMinutes: 5, ...(chapter ? { chapter } : {}) });

describe("program chapters", () => {
  it("groups consecutive lessons of the same chapter and keeps global numbering", () => {
    const groups = groupByChapter([lesson("a", "Старт"), lesson("b", "Старт"), lesson("c", "Текст"), lesson("d")]);
    expect(groups.map((g) => [g.title, g.lessons.map((l) => `${l.index}:${l.lesson.slug}`)])).toEqual([
      ["Старт", ["0:a", "1:b"]],
      ["Текст", ["2:c"]],
      [null, ["3:d"]]
    ]);
  });
  it("leaves a course without chapters as one ungrouped list", () => {
    expect(groupByChapter([lesson("a"), lesson("b")])).toEqual([{ title: null, lessons: [{ lesson: lesson("a"), index: 0 }, { lesson: lesson("b"), index: 1 }] }]);
  });
});
