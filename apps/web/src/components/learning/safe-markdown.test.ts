import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { SafeMarkdown, safeMarkdownUrl } from "./safe-markdown";
describe("untrusted lesson Markdown", () => {
  it.each([
    "javascript:alert(1)",
    "data:text/html,<script>alert(1)</script>",
    "//evil.example",
    "file:///etc/passwd",
    "https://user:password@example.test"
  ])("rejects unsafe URL %s", (value) => {
    expect(safeMarkdownUrl(value)).toBeUndefined();
  });
  it("allows explicit web/email links only", () => {
    expect(safeMarkdownUrl("https://example.test/help")).toBe(
      "https://example.test/help"
    );
    expect(safeMarkdownUrl("mailto:help@example.test")).toBe(
      "mailto:help@example.test"
    );
  });
  it("renders common Markdown and suppresses HTML, events, images and unsafe links", () => {
    const html = renderToStaticMarkup(
      createElement(SafeMarkdown, {
        children:
          '# Notes\n\n**Useful** [safe](https://example.test) [unsafe](javascript:alert%281%29)\n\n<img src=x onerror="alert(1)">\n\n<script>alert(1)</script>\n\n![tracking](https://evil.example/pixel)\n\n- One\n- Two\n\n```js\nconst a = 1;\n```'
      })
    );
    expect(html).toContain("<h2>Notes</h2>");
    expect(html).toContain("<strong>Useful</strong>");
    expect(html).toContain("<ul>");
    expect(html).toMatch(/<pre[^>]*tabindex="0"/);
    expect(html).toContain("Скопировать код");
    expect(html).toContain('href="https://example.test/"');
    expect(html).not.toMatch(
      /<script|<img|onerror|javascript:|evil.example|<h1>/
    );
  });
});
