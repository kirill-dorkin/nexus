import { describe, expect, it } from "vitest";

import { assignmentSource, evaluateAssignment } from "./assignment";
import { parseHtmlOnServer } from "./server";

const assignment = {
  entry: "index.html",
  checks: [
    { label: "Есть заголовок первого уровня", selector: "h1" },
    { label: "Заголовок говорит «Привет»", selector: "h1", text: "Привет" },
    {
      label: "Заголовок красный",
      css: { selector: "h1", property: "color", value: ["red", "#f00"] },
      hint: "Задайте цвет в style.css."
    },
    {
      label: "Подключён style.css",
      selector: 'link[rel="stylesheet"][href="style.css"]'
    }
  ]
};

const page = (body: string) =>
  `<!doctype html><html><head><link rel="stylesheet" href="style.css"></head><body>${body}</body></html>`;

describe("evaluateAssignment (ADR-0073)", () => {
  it("passes when every check passes, reading rules from a stylesheet file", () => {
    const result = evaluateAssignment(
      {
        "index.html": page("<h1>Привет</h1>"),
        "style.css": "h1 { color: red; }"
      },
      assignment,
      parseHtmlOnServer
    );
    expect(result.outcome).toBe("passed");
    expect(result.score).toBe(1);
    expect(result.checks.every((check) => check.passed)).toBe(true);
    expect(result.checks.some((check) => "hint" in check)).toBe(false);
  });

  it("reads a rule written in the page's own <style> too", () => {
    const result = evaluateAssignment(
      { "index.html": page("<style>h1{color:#f00}</style><h1>Привет</h1>") },
      assignment,
      parseHtmlOnServer
    );
    expect(result.checks[2]?.passed).toBe(true);
  });

  it("names what to fix, with the author's hint, and scores the share passed", () => {
    const result = evaluateAssignment(
      {
        "index.html": page("<h1>Пока</h1>"),
        "style.css": "h1 { color: blue; }"
      },
      assignment,
      parseHtmlOnServer
    );
    expect(result.outcome).toBe("failed");
    expect(result.score).toBe(0.5);
    expect(result.checks).toEqual([
      { label: "Есть заголовок первого уровня", passed: true },
      { label: "Заголовок говорит «Привет»", passed: false },
      {
        label: "Заголовок красный",
        passed: false,
        hint: "Задайте цвет в style.css."
      },
      { label: "Подключён style.css", passed: true }
    ]);
  });

  it("fails every check when the entry page is missing", () => {
    const result = evaluateAssignment(
      { "style.css": "h1 { color: red; }" },
      { ...assignment, checks: assignment.checks.slice(0, 2) },
      parseHtmlOnServer
    );
    expect(result.outcome).toBe("failed");
    expect(result.score).toBe(0);
  });

  it("keeps stylesheets in path order and leaves other files out", () => {
    expect(
      assignmentSource(
        {
          "index.html": "<p>",
          "b.css": "b{}",
          "a.css": "a{}",
          "notes.txt": "x"
        },
        "index.html"
      )
    ).toBe("<p>\n<style>\na{}\n</style>\n<style>\nb{}\n</style>");
  });
});
