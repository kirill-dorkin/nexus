import { describe, expect, it } from "vitest";
import { parseVisual } from "./lesson-visuals";
import { highlight } from "./code-highlight";

describe("lesson visuals", () => {
  it("accepts valid diagrams and demos", () => {
    expect(parseVisual('{"kind":"url","parts":[{"text":"https://","label":"протокол"}]}')?.kind).toBe("url");
    expect(parseVisual('{"kind":"tree","items":[{"name":"site/","depth":0}]}')?.kind).toBe("tree");
    expect(parseVisual('{"kind":"typing","scenes":[{"input":"ul>li*3","key":"Tab","output":"<ul></ul>"}]}')?.kind).toBe("typing");
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
  it("keeps unknown languages as plain text", () => {
    expect(highlight("WEBVTT", "text")).toEqual([{ kind: "plain", text: "WEBVTT" }]);
  });
});
