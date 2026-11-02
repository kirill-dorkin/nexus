import { describe, expect, it } from "vitest";
import { cssMatches, readCss } from "./css-rules";

const page = `<style>
  /* comment { color: red } */
  .card, .menu > li { display: grid; gap: 1rem ; color: RGB(0, 0, 0) !important; }
  @media (min-width: 600px) {
    .menu { flex-direction: row; }
  }
  .nav {
    color: navy;
    & a { text-decoration: none; }
    li { margin: 0; }
  }
  @keyframes pulse { from { opacity: 0.5 } to { opacity: 1 } }
  @font-face { font-family: "Brand"; src: url("brand.woff2"); }
</style><div class="card"></div>`;

describe("css rules", () => {
  const rules = readCss(page);
  it("reads selectors, values and contexts with normalisation", () => {
    expect(cssMatches(rules, { selector: ".card", property: "display", value: "grid" })).toBe(true);
    expect(cssMatches(rules, { selector: ".menu>li", property: "gap", value: "1rem" })).toBe(true);
    expect(cssMatches(rules, { selector: ".card", property: "color", value: "rgb(0,0,0)" })).toBe(true);
    expect(cssMatches(rules, { selector: ".card", property: "display", value: ["flex", "inline-flex"] })).toBe(false);
    expect(cssMatches(rules, { selector: ".card", property: "color", value: "red" })).toBe(false);
  });
  it("knows which at-rule a declaration lives in", () => {
    expect(cssMatches(rules, { selector: ".menu", property: "flex-direction", value: "row", within: "min-width: 600px" })).toBe(true);
    expect(cssMatches(rules, { selector: ".card", property: "display", within: "@media" })).toBe(false);
    expect(cssMatches(rules, { selector: "to", property: "opacity", value: "1", within: "@keyframes pulse" })).toBe(true);
    expect(cssMatches(rules, { selector: "@font-face", property: "font-family", includes: "brand" })).toBe(true);
  });
  it("resolves nesting with and without &", () => {
    expect(cssMatches(rules, { selector: ".nav a", property: "text-decoration", value: "none" })).toBe(true);
    expect(cssMatches(rules, { selector: ".nav li", property: "margin", value: "0" })).toBe(true);
    expect(cssMatches(rules, { selector: ".nav", property: "color", value: "navy" })).toBe(true);
  });
  it("ignores comments and returns nothing for plain HTML", () => {
    expect(cssMatches(rules, { selector: "comment", property: "color" })).toBe(false);
    expect(readCss("<p>Привет</p>")).toEqual([]);
  });
});
