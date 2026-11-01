import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { CodeSnippet } from "./code-snippet";

describe("lesson code snippet", () => {
  it("offers the local sandbox only for HTML examples and loads no frame up front", () => {
    const html = renderToStaticMarkup(createElement(CodeSnippet, { code: "<h1>Привет</h1>", language: "html" }));
    expect(html).toContain("Попробовать");
    expect(html).not.toContain("<iframe");
    const js = renderToStaticMarkup(createElement(CodeSnippet, { code: "const a = 1;", language: "js" }));
    expect(js).not.toContain("Попробовать");
    expect(js).toContain("Скопировать код");
  });
});
