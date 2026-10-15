import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, it, expect } from "vitest";
import { courseManifestV1Schema } from "@platform/contracts";
import { readFileSync } from "node:fs";
import { ActivityEditor, ManualEditor } from "./manual-editor";
import { DraftPreview } from "./draft-preview";
import { appendLesson, appendQuizToLesson, move, newActivity, parseEditorJson } from "./editor-model";
const example = courseManifestV1Schema.parse(
  JSON.parse(
    readFileSync("docs/examples/computer-basics.manifest.json", "utf8")
  )
);
describe("Studio document parity and safe author preview", () => {
  it("keeps all quiz shapes editable without discarding protected author fields", () => {
    const d = structuredClone(example);
    const multi = newActivity("quiz.multiple_choice", "multi", [
      d.skills[0]!.key
    ]);
    const text = newActivity("quiz.short_text", "short", [d.skills[0]!.key]);
    multi.title = "Multi";
    multi.presentation.question = "Q";
    if (multi.type !== "quiz.short_text")
      multi.presentation.options.forEach((o) => (o.text = o.id));
    text.title = "Short";
    text.presentation.question = "Q";
    if (text.type === "quiz.short_text")
      text.validation.acceptedAnswers = ["SECRET_TEXT"];
    d.activities.push(multi, text);
    d.activities.forEach((a) => {
      a.validation.explanation = "SECRET_EXPLANATION";
    });
    const parsed = parseEditorJson(JSON.stringify(d));
    expect(parsed.manifest).toEqual(d);
    const html = renderToStaticMarkup(
      createElement(ManualEditor, {
        document: d,
        existing: true,
        edit: () => {}
      })
    );
    for (const label of [
      "Программа курса",
      "Настройки курса и навыки",
      "Банк заданий",
      "Добавить урок",
      "Длительность, минут",
      "Вид задания",
      "Редактировать вопрос и правильные ответы",
      "Краткое описание урока",
      "Обязательное задание"
    ]) expect(html).toContain(label);
    const shortHtml = renderToStaticMarkup(createElement(ActivityEditor, {
      activity: text,
      index: d.activities.length - 1,
      document: d,
      edit: () => {},
      embedded: true
    }));
    expect(shortHtml).toContain("Допустимый ответ 1");
    expect(shortHtml).toContain("SECRET_TEXT");
    expect(shortHtml).toContain("SECRET_EXPLANATION");
    expect(shortHtml).toContain("Учитывать регистр");
    const choicesHtml = renderToStaticMarkup(createElement(ActivityEditor, {
      activity: multi,
      index: d.activities.length - 2,
      document: d,
      edit: () => {},
      embedded: true
    }));
    expect(choicesHtml).toContain("Правильный вариант 1");
    expect(choicesHtml).toContain("Объяснение автора");
    expect(choicesHtml).not.toContain("Удалить задание");
  });
  it("renders no answer keys, executable HTML or learner check controls in preview", () => {
    const d = structuredClone(example);
    d.activities[0]!.validation.explanation = "SECRET_EXPLANATION";
    d.lessons[0]!.blocks.push({
      type: "markdown",
      markdown: "<script>alert(1)</script>\n[Bad](javascript:alert%281%29)"
    });
    const html = renderToStaticMarkup(
      createElement(DraftPreview, { document: d })
    );
    expect(html).not.toContain("SECRET_EXPLANATION");
    expect(html).not.toContain("correctOptionId");
    expect(html).not.toContain("<script>");
    expect(html).not.toContain('href="javascript:');
    expect(html).not.toContain("<form");
    expect(html).not.toContain("<iframe");
    expect(html).toContain("Смотреть видео");
    expect(html).toContain("https://www.youtube.com/watch?v=aqz-KE-bpKQ");
  });
  it("reports schema paths and never accepts unknown tenant/actor authority", () => {
    expect(parseEditorJson("{").issues[0]).toContain("JSON");
    const bad = structuredClone(example);
    bad.lessons[0]!.blocks = [
      {
        type: "activity",
        activitySlug: "missing",
        kind: "practice",
        required: true
      }
    ];
    expect(parseEditorJson(JSON.stringify(bad)).issues.join(" ")).toContain(
      "lessons.0.blocks.0.activitySlug"
    );
    expect(
      parseEditorJson(JSON.stringify({ ...example, organizationId: "caller" }))
        .manifest
    ).toBeNull();
  });
  it("uses array order as canonical order without generating another identity", () => {
    const d = structuredClone(example);
    d.lessons.push({ ...d.lessons[0]!, slug: "other" });
    move(d.lessons, 1, -1);
    expect(d.lessons.map((l) => l.slug)).toEqual([
      "other",
      "computer-introduction"
    ]);
    move(d.lessons, 0, -1);
    expect(d.lessons[0]!.slug).toBe("other");
  });
  it("creates lesson-local quiz links without destroying shared course identities", () => {
    const d = structuredClone(example);
    const existing = JSON.stringify(d);
    const i = appendLesson(d);
    expect(i).toBe(example.lessons.length);
    expect(d.lessons[i]!.slug).toMatch(/^urok-/);
    const quizSlug = appendQuizToLesson(d, i);
    expect(d.lessons[i]!.blocks).toEqual([
      { type: "activity", activitySlug: quizSlug, kind: "practice", required: true }
    ]);
    const quiz = d.activities.find((a) => a.slug === quizSlug)!;
    expect(quiz.type).toBe("quiz.single_choice");
    expect(quiz.skillKeys).toEqual([d.skills[0]!.key]);
    expect(JSON.stringify({ ...d, activities: d.activities.slice(0, -1), lessons: d.lessons.slice(0, -1) })).toBe(existing);
    // An unlinked quiz stays in the bank: reuse across lessons is never silently erased.
    d.lessons[i]!.blocks.splice(0, 1);
    expect(d.activities.some((a) => a.slug === quizSlug)).toBe(true);
    expect(() => appendQuizToLesson({ ...d, skills: [] }, i)).toThrow(/навык/);
    expect(parseEditorJson(JSON.stringify(d)).manifest).toBeNull(); // Empty new lesson cannot be published.
  });

});
