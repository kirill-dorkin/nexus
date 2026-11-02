import { describe, expect, it } from "vitest";
import { caretOffset, parseVisual } from "./lesson-visuals";
import { highlight } from "./code-highlight";

describe("lesson visuals", () => {
  it("accepts valid diagrams and demos", () => {
    expect(parseVisual('{"kind":"url","parts":[{"text":"https://","label":"протокол"}]}')?.kind).toBe("url");
    expect(parseVisual('{"kind":"tree","items":[{"name":"site/","depth":0}]}')?.kind).toBe("tree");
    expect(parseVisual('{"kind":"typing","scenes":[{"input":"ul>li*3","key":"Tab","output":"<ul></ul>"}]}')?.kind).toBe("typing");
  });
  it("treats a single-scene typing block as one animation and keeps legacy scenes", () => {
    const single = parseVisual('{"kind":"typing","input":"h1+p","key":"Tab","output":"<h1></h1>","parts":[{"text":"h1","label":"заголовок"},{"text":"+","label":"рядом"},{"text":"p","label":"абзац"}]}');
    expect(single).toMatchObject({ kind: "typing", scenes: [{ input: "h1+p", parts: [{ text: "h1" }, { text: "+" }, { text: "p" }] }] });
    const legacy = parseVisual('{"kind":"typing","scenes":[{"input":"a"},{"input":"b"}]}');
    expect(legacy?.kind === "typing" && legacy.scenes.length).toBe(2);
    expect(parseVisual('{"kind":"typing","input":"a","parts":[{"text":1}]}')).toBeNull();
  });
  it("puts the caret where Emmet would: first empty attribute, element or blank line", () => {
    expect(caretOffset("<ul>\n  <li></li>\n</ul>")).toBe("<ul>\n  <li>".length);
    expect(caretOffset('<a href=""></a>')).toBe('<a href="'.length);
    expect(caretOffset("<body>\n  \n</body>")).toBe("<body>\n  ".length);
    expect(caretOffset('<a href="/x">X</a>')).toBe('<a href="/x">X</a>'.length);
  });
  it("rejects malformed or unknown input so the page falls back to code", () => {
    expect(parseVisual("{not json")).toBeNull();
    expect(parseVisual('{"kind":"script","src":"x"}')).toBeNull();
    expect(parseVisual('{"kind":"url","parts":[]}')).toBeNull();
    expect(parseVisual('{"kind":"tree","items":[{"name":"a","depth":99}]}')).toBeNull();
  });
});

describe("code highlighting", () => {
  it("classifies HTML parts without dropping any text", () => {
    const code = '<!-- c --><a href="/x">Tom &amp; Jerry</a>';
    const tokens = highlight(code, "html");
    expect(tokens.map((t) => t.text).join("")).toBe(code);
    expect(tokens.find((t) => t.kind === "tag")?.text).toBe("a");
    expect(tokens.find((t) => t.kind === "attr")?.text).toBe("href");
    expect(tokens.find((t) => t.kind === "string")?.text).toBe('"/x"');
    expect(tokens.find((t) => t.kind === "entity")?.text).toBe("&amp;");
    expect(tokens.find((t) => t.kind === "comment")?.text).toBe("<!-- c -->");
  });
  it("highlights CSS inside <style> without dropping text", () => {
    const code = "<style>.card { color: red; }</style><p>x</p>";
    const tokens = highlight(code, "html");
    expect(tokens.map((t) => t.text).join("")).toBe(code);
    expect(tokens.find((t) => t.kind === "property")?.text).toBe("color");
    expect(tokens.filter((t) => t.kind === "tag").map((t) => t.text)).toEqual(["style", "style", "p", "p"]);
  });
  it("highlights SQL keywords in any case, strings, comments, numbers and functions", () => {
    const code = "-- меню\nselect name, round(price, 2) FROM products WHERE city = 'Москва' AND id > 10;";
    const tokens = highlight(code, "sql");
    expect(tokens.map((t) => t.text).join("")).toBe(code);
    expect(tokens.filter((t) => t.kind === "keyword").map((t) => t.text)).toEqual(["select", "FROM", "WHERE", "AND"]);
    expect(tokens.find((t) => t.kind === "comment")?.text).toBe("-- меню");
    expect(tokens.find((t) => t.kind === "string")?.text).toBe("'Москва'");
    expect(tokens.find((t) => t.kind === "property")?.text).toBe("round");
    expect(tokens.filter((t) => t.kind === "number").map((t) => t.text)).toEqual(["2", "10"]);
  });
  it("keeps unknown languages as plain text", () => {
    expect(highlight("WEBVTT", "text")).toEqual([{ kind: "plain", text: "WEBVTT" }]);
  });
});
