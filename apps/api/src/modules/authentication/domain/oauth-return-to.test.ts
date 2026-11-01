import { describe, expect, it } from "vitest";

import { safeOAuthReturnTo } from "./oauth-return-to";

describe("OAuth return path", () => {
  it("keeps only reviewed local learning and Studio paths", () => {
    expect(safeOAuthReturnTo("/me/learning")).toBe("/me/learning");
    expect(safeOAuthReturnTo("/learn/acme/dev-basics/intro")).toBe(
      "/learn/acme/dev-basics/intro"
    );
    expect(safeOAuthReturnTo("/courses/html")).toBe("/courses/html");
    expect(safeOAuthReturnTo("/courses/html/how-the-web-works")).toBe("/courses/html/how-the-web-works");
  });

  it.each([
    "https://evil.example/learn/acme/course",
    "//evil.example/learn/acme/course",
    "/courses",
    "/courses/html/a/b",
    "/courses/html/../x",
    "/courses/html?next=https://evil.example",
    "/learn/acme/course/lesson/extra",
    "/studio/not-a-uuid/new"
  ])("rejects unsafe return path %s", (value) => {
    expect(safeOAuthReturnTo(value)).toBe("/me/learning");
  });
});
