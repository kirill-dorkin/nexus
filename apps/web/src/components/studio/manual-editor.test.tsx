import type { CourseManifestV1 } from "@platform/contracts";
import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it } from "vitest";

import { manifest } from "../../test/fixtures";
import { ManualEditor } from "./manual-editor";
import { quizAt } from "./editor-commands";

/** Renders the editor over real state and exposes the latest document. */
function setup(initial: CourseManifestV1 = manifest(), existing = false) {
  const latest = { current: initial };
  function Harness() {
    const [document, setDocument] = useState(initial);
    return (
      <ManualEditor
        document={document}
        existing={existing}
        edit={(change) => {
          setDocument((old) => {
            const next = structuredClone(old);
            change(next);
            latest.current = next;
            return next;
          });
        }}
      />
    );
  }
  render(<Harness />);
  return latest;
}
const section = (name: string) => within(screen.getByRole("region", { name }));
/** Replaces a field's value in one event, like pasting. */
function set(field: HTMLElement, value: string) {
  fireEvent.change(field, { target: { value } });
}

describe("ManualEditor", () => {
  it("edits the course and locks the address of an existing course", () => {
    const doc = setup();
    set(screen.getByLabelText("Название курса"), "HTML для начинающих");
    expect(doc.current.course.title).toBe("HTML для начинающих");

    setup(manifest(), true);
    expect(
      screen.getAllByLabelText("Адрес курса (slug)").at(-1)
    ).toHaveAttribute("readonly");
  });

  it("renames a skill everywhere it is used", () => {
    const doc = setup();
    set(section("Навыки").getByLabelText("Ключ навыка"), "markup");
    expect(doc.current.skills[0]?.key).toBe("markup");
    expect(doc.current.activities[0]?.skillKeys).toEqual(["markup"]);
  });

  it("adds a skill and an activity linked to the first skill", async () => {
    const doc = setup();
    await userEvent.click(
      screen.getByRole("button", { name: "Добавить навык" })
    );
    expect(doc.current.skills).toHaveLength(2);

    await userEvent.click(
      screen.getByRole("button", { name: "Добавить задание" })
    );
    expect(doc.current.activities[1]).toMatchObject({
      type: "quiz.single_choice",
      skillKeys: ["tags"]
    });
  });

  it("renames an activity in every lesson that shows it", () => {
    const doc = setup();
    set(
      section("Задания").getByLabelText("Адрес задания (slug)"),
      "heading-tag"
    );
    expect(doc.current.lessons[0]?.blocks[1]).toMatchObject({
      activitySlug: "heading-tag"
    });
  });

  it("renames an option and keeps it the correct answer", () => {
    const doc = setup();
    set(section("Задания").getAllByLabelText("Ключ варианта")[0]!, "heading");
    expect(doc.current.activities[0]).toMatchObject({
      presentation: { options: [{ id: "heading" }, { id: "p" }] },
      validation: { correctOptionId: "heading" }
    });
  });

  it("changes the question type and keeps the question, options and answer", async () => {
    const doc = setup();
    await userEvent.selectOptions(
      section("Задания").getByLabelText("Тип задания"),
      "quiz.multiple_choice"
    );
    expect(doc.current.activities[0]).toMatchObject({
      type: "quiz.multiple_choice",
      title: "Первый тег",
      presentation: {
        question: "Какой тег делает заголовок?",
        options: [{ id: "h1" }, { id: "p" }]
      },
      validation: { correctOptionIds: ["h1"], explanation: "Заголовок — h1." }
    });

    await userEvent.selectOptions(
      section("Задания").getByLabelText("Тип задания"),
      "quiz.short_text"
    );
    expect(doc.current.activities[0]).toMatchObject({
      type: "quiz.short_text",
      presentation: { question: "Какой тег делает заголовок?" },
      validation: { acceptedAnswers: [""], caseSensitive: false }
    });
  });

  it("marks several correct options of a multiple-choice question", async () => {
    const initial = manifest();
    const activity = quizAt(initial.activities, 0)!;
    initial.activities[0] = {
      ...activity,
      type: "quiz.multiple_choice",
      presentation:
        activity.type === "quiz.short_text"
          ? { question: "", options: [] }
          : activity.presentation,
      validation: { correctOptionIds: ["h1"], explanation: "" }
    };
    const doc = setup(initial);
    await userEvent.click(
      section("Задания").getByRole("checkbox", { name: "Правильный вариант 2" })
    );
    expect(doc.current.activities[0]).toMatchObject({
      validation: { correctOptionIds: ["h1", "p"] }
    });
  });

  it("builds a lesson from video, notes and practice blocks", async () => {
    const doc = setup();
    const lessons = section("Уроки");
    await userEvent.click(
      lessons.getByRole("button", { name: "Добавить видео" })
    );
    set(lessons.getByLabelText("YouTube URL или ID"), "dQw4w9WgXcQ");
    expect(doc.current.lessons[0]?.blocks[2]).toEqual({
      type: "youtube",
      videoId: "dQw4w9WgXcQ"
    });

    await userEvent.click(
      lessons.getByRole("button", { name: "Добавить практику" })
    );
    expect(doc.current.lessons[0]?.blocks[3]).toEqual({
      type: "activity",
      activitySlug: "first-tag",
      kind: "practice",
      required: true
    });
  });

  it("sets and clears the optional chapter", () => {
    const doc = setup();
    const chapter = section("Уроки").getByLabelText("Глава (необязательно)");
    set(chapter, "Основы");
    expect(doc.current.lessons[0]?.chapter).toBe("Основы");
    set(chapter, "  ");
    expect(doc.current.lessons[0]).not.toHaveProperty("chapter");
  });

  it("reorders and removes lesson blocks", async () => {
    const doc = setup();
    const lessons = section("Уроки");
    expect(
      lessons.getByRole("button", { name: "Блок 1: вверх" })
    ).toBeDisabled();
    await userEvent.click(
      lessons.getByRole("button", { name: "Блок 1: вниз" })
    );
    expect(doc.current.lessons[0]?.blocks.map((b) => b.type)).toEqual([
      "activity",
      "markdown"
    ]);

    await userEvent.click(
      lessons.getByRole("button", { name: "Удалить блок 2" })
    );
    expect(doc.current.lessons[0]?.blocks.map((b) => b.type)).toEqual([
      "activity"
    ]);
  });

  it("adds a lesson with a ten-minute default", async () => {
    const doc = setup();
    await userEvent.click(
      screen.getByRole("button", { name: "Добавить урок" })
    );
    expect(doc.current.lessons[1]).toEqual({
      slug: "",
      title: "",
      summary: "",
      durationMinutes: 10,
      blocks: []
    });
  });
});

describe("every form field writes its own value", () => {
  type Doc = ReturnType<typeof manifest>;
  const choice = (d: Doc) => {
    const a = d.activities[0];
    if (!a || a.type === "quiz.short_text" || a.type === "assignment.files")
      throw new Error("choice expected");
    return a;
  };
  const cases: [string, string, (d: Doc) => unknown][] = [
    ["Описание курса", "Новое описание", (d) => d.course.description],
    ["Адрес курса (slug)", "html-2", (d) => d.course.slug],
    ["Название навыка", "Разметка", (d) => d.skills[0]?.title],
    ["Описание навыка", "Умеет", (d) => d.skills[0]?.description],
    ["Название задания", "Заголовки", (d) => d.activities[0]?.title],
    ["Инструкция (Markdown)", "Выберите", (d) => d.activities[0]?.instructions],
    [
      "Вопрос (Markdown)",
      "Что?",
      (d) => quizAt(d.activities, 0)?.presentation.question
    ],
    [
      "Объяснение автора",
      "Потому что",
      (d) => quizAt(d.activities, 0)?.validation.explanation
    ],
    ["Адрес урока (slug)", "start", (d) => d.lessons[0]?.slug],
    ["Название урока", "Старт", (d) => d.lessons[0]?.title],
    ["Краткое описание урока", "Коротко", (d) => d.lessons[0]?.summary],
    ["Конспект (Markdown)", "# Текст", (d) => d.lessons[0]?.blocks[0]],
    [
      "Заголовок блока (необязательно)",
      "Проверка",
      (d) => d.lessons[0]?.blocks[1]
    ]
  ];
  it.each(cases)("%s", (label, value, read) => {
    const doc = setup();
    set(screen.getAllByLabelText(label)[0]!, value);
    expect(JSON.stringify(read(doc.current))).toContain(value);
  });

  it("text and correctness of options, lesson duration and block settings", async () => {
    const doc = setup();
    set(
      section("Задания").getAllByLabelText("Текст варианта")[1]!,
      "<p> абзац"
    );
    expect(choice(doc.current).presentation.options[1]?.text).toBe("<p> абзац");
    await userEvent.click(
      section("Задания").getByRole("radio", { name: "Правильный вариант 2" })
    );
    expect(choice(doc.current).validation).toMatchObject({
      correctOptionId: "p"
    });

    set(section("Уроки").getByLabelText("Длительность, минут"), "25");
    expect(doc.current.lessons[0]?.durationMinutes).toBe(25);
    await userEvent.selectOptions(
      section("Уроки").getByLabelText("Вид задания"),
      "homework"
    );
    await userEvent.click(
      section("Уроки").getByRole("checkbox", { name: "Обязательное задание" })
    );
    expect(doc.current.lessons[0]?.blocks[1]).toMatchObject({
      kind: "homework",
      required: false
    });
    await userEvent.selectOptions(
      section("Уроки").getByLabelText("Задание урока"),
      ""
    );
    expect(doc.current.lessons[0]?.blocks[1]).toMatchObject({
      activitySlug: ""
    });

    set(section("Уроки").getByLabelText("Заголовок блока (необязательно)"), "");
    expect(doc.current.lessons[0]?.blocks[1]).not.toHaveProperty("title");
  });

  it("short-text answers, case sensitivity, options and skill links", async () => {
    const doc = setup();
    await userEvent.click(
      section("Задания").getByRole("checkbox", { name: "Теги" })
    );
    expect(doc.current.activities[0]?.skillKeys).toEqual([]);
    await userEvent.click(
      section("Задания").getByRole("button", { name: "Добавить вариант" })
    );
    await userEvent.click(
      section("Задания").getByRole("button", { name: "Вариант 1: вниз" })
    );
    await userEvent.click(
      section("Задания").getByRole("button", { name: "Удалить вариант 3" })
    );
    expect(choice(doc.current).presentation.options.map((o) => o.id)).toEqual([
      "p",
      "h1"
    ]);

    await userEvent.selectOptions(
      section("Задания").getByLabelText("Тип задания"),
      "quiz.short_text"
    );
    set(section("Задания").getByLabelText("Допустимый ответ 1"), "h1");
    await userEvent.click(
      section("Задания").getByRole("button", {
        name: "Добавить допустимый ответ"
      })
    );
    set(section("Задания").getByLabelText("Допустимый ответ 2"), "H1");
    await userEvent.click(
      section("Задания").getByRole("button", { name: "Ответ 1: вниз" })
    );
    await userEvent.click(
      section("Задания").getByRole("checkbox", { name: "Учитывать регистр" })
    );
    expect(doc.current.activities[0]).toMatchObject({
      validation: { acceptedAnswers: ["H1", "h1"], caseSensitive: true }
    });
    await userEvent.click(
      section("Задания").getByRole("button", { name: "Удалить ответ 2" })
    );
    expect(doc.current.activities[0]).toMatchObject({
      validation: { acceptedAnswers: ["H1"] }
    });
  });

  it("reorders and removes skills, activities and lessons", async () => {
    const doc = setup();
    await userEvent.click(
      screen.getByRole("button", { name: "Добавить навык" })
    );
    await userEvent.click(
      screen.getByRole("button", { name: "Навык 1: вниз" })
    );
    expect(doc.current.skills.map((s) => s.key)).toEqual(["", "tags"]);
    await userEvent.click(
      screen.getByRole("button", { name: "Удалить навык 2" })
    );
    expect(doc.current.activities[0]?.skillKeys).toEqual([]);

    await userEvent.click(
      screen.getByRole("button", { name: "Добавить задание" })
    );
    await userEvent.click(
      screen.getByRole("button", { name: "Задание 2: вверх" })
    );
    await userEvent.click(
      screen.getByRole("button", { name: "Удалить задание 2" })
    );
    expect(doc.current.activities).toHaveLength(1);

    await userEvent.click(
      screen.getByRole("button", { name: "Добавить урок" })
    );
    await userEvent.click(screen.getByRole("button", { name: "Урок 1: вниз" }));
    await userEvent.click(
      screen.getByRole("button", { name: "Удалить урок 1" })
    );
    expect(doc.current.lessons.map((l) => l.slug)).toEqual(["intro"]);
    await userEvent.click(
      section("Уроки").getByRole("button", { name: "Добавить конспект" })
    );
    expect(doc.current.lessons[0]?.blocks.at(-1)).toEqual({
      type: "markdown",
      markdown: ""
    });
  });
});
