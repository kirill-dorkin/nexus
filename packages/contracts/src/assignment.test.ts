import { describe, expect, it } from "vitest";

import {
  ASSIGNMENT_LIMITS,
  fileAssignmentSpecSchema,
  isAssignmentPath,
  matchesAllowedFile,
  uploadProblems
} from "./assignment";

const spec = {
  lang: "html",
  starterFiles: { "index.html": "<!doctype html>", "style.css": "" },
  allowedFiles: ["index.html", "style.css", "images/*.svg"],
  checks: [{ label: "Есть заголовок", selector: "h1" }],
  solutionFiles: { "index.html": "<h1>Привет</h1>" }
};

describe("file assignment contract (ADR-0073)", () => {
  it("accepts a valid assignment and defaults the entry", () => {
    expect(fileAssignmentSpecSchema.parse(spec).entry).toBe("index.html");
  });

  it("rejects files outside allowedFiles and a solution without the entry", () => {
    expect(
      fileAssignmentSpecSchema.safeParse({
        ...spec,
        starterFiles: { "app.js": "" }
      }).success
    ).toBe(false);
    expect(
      fileAssignmentSpecSchema.safeParse({
        ...spec,
        solutionFiles: { "style.css": "h1{}" }
      }).success
    ).toBe(false);
  });

  it("requires exactly one kind of check", () => {
    expect(
      fileAssignmentSpecSchema.safeParse({
        ...spec,
        checks: [{ label: "x", selector: "h1", contains: "h1" }]
      }).success
    ).toBe(false);
    expect(
      fileAssignmentSpecSchema.safeParse({
        ...spec,
        checks: [
          {
            label: "Цвет заголовка",
            css: { selector: "h1", property: "color", value: ["red", "#f00"] }
          }
        ]
      }).success
    ).toBe(true);
  });

  it("accepts only relative paths inside the assignment", () => {
    for (const ok of ["index.html", "images/logo.svg", "a/b/c/d/e.css"])
      expect(isAssignmentPath(ok), ok).toBe(true);
    for (const bad of [
      "",
      "../index.html",
      "/etc/passwd",
      "a\\b.html",
      "a//b.html",
      ".env",
      "a/./b.html",
      "a/b/c/d/e/f.css"
    ])
      expect(isAssignmentPath(bad), bad).toBe(false);
  });

  it("matches exact paths and one-folder extension patterns", () => {
    expect(matchesAllowedFile("images/logo.svg", "images/*.svg")).toBe(true);
    expect(matchesAllowedFile("images/sub/logo.svg", "images/*.svg")).toBe(
      false
    );
    expect(matchesAllowedFile("logo.svg", "images/*.svg")).toBe(false);
    expect(matchesAllowedFile("style.css", "*.css")).toBe(true);
    expect(matchesAllowedFile(".css", "*.css")).toBe(false);
    expect(matchesAllowedFile("index.html", "index.html")).toBe(true);
  });

  it("lists every reason an upload cannot be checked", () => {
    expect(
      uploadProblems(
        { "index.html": "<h1></h1>" },
        { entry: "index.html", allowedFiles: spec.allowedFiles }
      )
    ).toEqual([]);
    expect(
      uploadProblems(
        {
          "../x.html": "",
          "app.js": "",
          "style.css": "x".repeat(ASSIGNMENT_LIMITS.maxFileBytes + 1)
        },
        { entry: "index.html", allowedFiles: spec.allowedFiles }
      )
    ).toEqual([
      "bad_path:../x.html",
      "not_allowed:app.js",
      "file_too_large:style.css",
      "missing_entry:index.html"
    ]);
  });
});
