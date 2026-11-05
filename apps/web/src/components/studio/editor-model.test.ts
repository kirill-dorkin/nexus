import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, it, expect, vi } from "vitest";
import { courseManifestV1Schema } from "@platform/contracts";
import { readFileSync } from "node:fs";
import { ManualEditor } from "./manual-editor";
import { DraftPreview } from "./draft-preview";
import { move, newActivity, parseEditorJson } from "./editor-model";
import { isQuizActivity } from "@platform/contracts";
import { quizAt } from "./editor-commands";
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
      if (isQuizActivity(a)) a.validation.explanation = "SECRET_EXPLANATION";
    });
    const parsed = parseEditorJson(JSON.stringify(d));
    expect(parsed.manifest).toEqual(d);
    const html = renderToStaticMarkup(
      createElement(ManualEditor, {
        document: d,
        existing: true,
        edit: vi.fn()
      })
    );
    for (const label of [
      "Учитывать регистр",
      "Допустимый ответ 1",
      "Правильный вариант 1",
      "Объяснение автора",
      "Длительность, минут",
      "Заголовок блока",
      "Обязательное задание",
      "Ключ навыка",
      "Краткое описание урока",
      "Вид задания"
    ])
      expect(html).toContain(label);
    expect(html).toContain("SECRET_TEXT");
    expect(html).toContain("SECRET_EXPLANATION");
  });
  it("renders no answer keys, executable HTML or learner check controls in preview", () => {
    const d = structuredClone(example);
    quizAt(d.activities, 0)!.validation.explanation = "SECRET_EXPLANATION";
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
});
