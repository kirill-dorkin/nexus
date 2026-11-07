import { describe, expect, it } from "vitest";

import { highlight, type Token } from "./code-highlight";

const kinds = (tokens: Token[], kind: Token["kind"]) =>
  tokens.filter((t) => t.kind === kind).map((t) => t.text);

describe("highlight", () => {
  it("keeps every character of the code", () => {
    const code = '<p class="a">Привет</p>';
    expect(
      highlight(code, "html")
        .map((t) => t.text)
        .join("")
    ).toBe(code);
  });

  it("highlights HTML: comments, doctype, tags, attributes and entities", () => {
    const tokens = highlight(
      "<!DOCTYPE html><!-- note --><img src=pic.png alt='x' hidden/><p>a &amp; b</p>",
      "HTML"
    );
    expect(kinds(tokens, "doctype")).toEqual(["<!DOCTYPE html>"]);
    expect(kinds(tokens, "comment")).toEqual(["<!-- note -->"]);
    expect(kinds(tokens, "attr")).toEqual(["src", "alt", "hidden"]);
    expect(kinds(tokens, "string")).toEqual(["pic.png", "'x'"]);
    expect(kinds(tokens, "entity")).toEqual(["&amp;"]);
    // Neighbouring punctuation merges: "/>" runs into the next "<".
    expect(kinds(tokens, "punct").some((t) => t.startsWith("/>"))).toBe(true);
  });

  it("closes unterminated HTML comments and doctypes at the end", () => {
    expect(kinds(highlight("<!-- open", "xml"), "comment")).toEqual([
      "<!-- open"
    ]);
    expect(kinds(highlight("<!DOCTYPE", "svg"), "doctype")).toEqual([
      "<!DOCTYPE"
    ]);
  });

  it("highlights embedded styles and scripts inside HTML", () => {
    const tokens = highlight(
      "<style>p { color: red }</style><script>const n = 1;</script>",
      "html"
    );
    expect(kinds(tokens, "property")).toContain("color");
    expect(kinds(tokens, "keyword")).toContain("const");
    expect(kinds(tokens, "number")).toContain("1");
  });

  it("highlights JSON keys and CSS properties differently from values", () => {
    const json = highlight('{ "title": "Python", "lessons": 33 }', "json");
    expect(kinds(json, "property")).toEqual(['"title"', '"lessons"']);
    expect(kinds(json, "string")).toEqual(['"Python"']);
    const css = highlight("/* card */ .card { margin: 4px; }", "css");
    expect(kinds(css, "comment")).toEqual(["/* card */"]);
    expect(kinds(css, "property")).toEqual(["margin"]);
    expect(kinds(css, "number")).toEqual(["4px"]);
  });

  it("highlights JavaScript and TypeScript keywords, strings and comments", () => {
    const tokens = highlight("// hi\nexport const s = `x`;", "ts");
    expect(kinds(tokens, "comment")).toEqual(["// hi"]);
    expect(kinds(tokens, "keyword")).toEqual(["export", "const"]);
    expect(kinds(tokens, "string")).toEqual(["`x`"]);
  });

  it("highlights SQL keywords in any case, functions, strings and comments", () => {
    const tokens = highlight(
      "-- top\nSELECT count(*) AS n, \"Name\" FROM users WHERE id = 7 AND note = 'it''s';",
      "PostgreSQL"
    );
    expect(kinds(tokens, "comment")).toEqual(["-- top"]);
    expect(kinds(tokens, "keyword")).toEqual(
      expect.arrayContaining(["SELECT", "AS", "FROM", "WHERE", "AND"])
    );
    expect(kinds(tokens, "property")).toEqual(["count"]);
    expect(kinds(tokens, "string")).toEqual(["'it''s'"]);
    expect(kinds(tokens, "number")).toEqual(["7"]);
    expect(tokens.some((t) => t.text.includes('"Name"'))).toBe(true);
    expect(kinds(highlight("SELECT $$body$$", "pgsql"), "string")).toEqual([
      "$$body$$"
    ]);
  });

  it("leaves unknown or missing languages as plain text", () => {
    expect(highlight("print('hi')", "python")).toEqual([
      { kind: "plain", text: "print('hi')" }
    ]);
    expect(highlight("ls -la")).toEqual([{ kind: "plain", text: "ls -la" }]);
  });
});
