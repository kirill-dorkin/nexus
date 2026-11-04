import { describe, expect, it } from "vitest";
import {
  readCss,
  runChecks,
  runStaticChecks,
  type ChallengeCheck
} from "./index";
import {
  MAX_SERVER_PAGE_LENGTH,
  UncheckablePageError,
  parseHtmlOnServer
} from "./server";

const check = (html: string, checks: Omit<ChallengeCheck, "label">[]) =>
  runChecks(
    html,
    checks.map((c) => ({ label: "x", ...c })),
    parseHtmlOnServer(html)
  );

describe("server HTML adapter", () => {
  it("builds the tree like a browser: implied elements and auto-closed paragraphs", () => {
    expect(
      check("<table><tr><td>1</td></tr></table><p>a<ul><li>b</ul>", [
        { selector: "table > tbody > tr > td" },
        { selector: "html > body > table" },
        { selector: "p ul", absent: true },
        { selector: "body > a:first-child", absent: true }
      ])
    ).toEqual([true, true, true, true]);
  });

  it("reads text, attributes and counts like the DOM", () => {
    const html = `<a HREF=" #main " data-x>Go <!-- not text --><b>now</b></a><a href="/">two</a>`;
    expect(
      check(html, [
        { selector: "a", text: "go now" },
        { selector: "a", attr: "href", value: "#main" },
        { selector: "a", attr: "data-x" },
        { selector: "a", attr: "href", count: 2 },
        { selector: "a", max: 1 },
        { selector: "a", text: "not text" }
      ])
    ).toEqual([true, true, true, true, false, false]);
  });

  it("keeps SVG attribute names case-sensitive and hides template content", () => {
    expect(
      check(`<svg viewBox="0 0 1 1"></svg><template><p>hidden</p></template>`, [
        { selector: "svg", attr: "viewBox" },
        { selector: "p", absent: true },
        { selector: "template", text: "hidden", absent: true }
      ])
    ).toEqual([true, true, true]);
  });

  it("treats an invalid selector as a failed check, never a crash", () => {
    expect(
      check("<p></p>", [{ selector: "p[" }, { selector: "p:nope" }])
    ).toEqual([false, false]);
  });

  it("never runs the learner's code", () => {
    const html = `<img src=x onerror="globalThis.ran=1"><script>globalThis.ran=1</script>`;
    expect(check(html, [{ selector: "script", text: "ran" }])).toEqual([true]);
    expect((globalThis as { ran?: number }).ran).toBeUndefined();
  });

  it("refuses oversized pages and parses only when a selector needs it", () => {
    const big = "x".repeat(MAX_SERVER_PAGE_LENGTH + 1);
    expect(() => parseHtmlOnServer(big)).toThrow(UncheckablePageError);
    expect(
      runStaticChecks(
        big,
        big,
        [{ label: "x", contains: "xx" }],
        parseHtmlOnServer
      )
    ).toEqual([true]);
  });

  it("refuses markup nested deeper than Chrome's limit, quickly", () => {
    const started = performance.now();
    for (const deep of [
      "<div>".repeat(140_000),
      // Quotes and raw text cannot hide nesting: the parser's own stack is counted.
      `<script>"<div a="</script>${"<section>".repeat(600)}"`,
      `<!-- <div a=" -->${"<ul><li>".repeat(300)}`
    ])
      expect(() => parseHtmlOnServer(deep)).toThrow(UncheckablePageError);
    expect(performance.now() - started).toBeLessThan(
      // Linear work takes milliseconds; quadratic would take minutes. Loose for loaded CI.
      15_000
    );
  }, 60_000);

  it("accepts large flat pages and nesting up to the limit", () => {
    const flat = "<div><p>a<li>b<br><img src=x></div>".repeat(20_000);
    expect(check(flat, [{ selector: "div", count: 20_000 }])).toEqual([true]);
    // html and body are the first two levels.
    const deep = "<div>".repeat(510) + "end";
    expect(
      check(deep, [{ selector: `body${" > div".repeat(510)}`, text: "end" }])
    ).toEqual([true]);
    expect(() => parseHtmlOnServer("<div>".repeat(511))).toThrow(
      UncheckablePageError
    );
  }, 60_000);

  it("parses <noscript> as markup, like DOMParser", () => {
    expect(
      check("<body><noscript><p>enable JS</p></noscript>", [
        { selector: "noscript p" }
      ])
    ).toEqual([true]);
  });
});

describe("CSS reader limits", () => {
  it("stays linear on unclosed tags, comments and deep nesting", () => {
    const inputs = [
      "<style ".repeat(40_000),
      "<style>" + "/*".repeat(100_000),
      "a{".repeat(100_000),
      "@media x{".repeat(50_000) + "a{color:red}"
    ];
    for (const input of inputs) {
      const started = performance.now();
      readCss(input);
      expect(performance.now() - started, input.slice(0, 12)).toBeLessThan(
        // Linear work takes milliseconds; quadratic would take minutes. Loose for loaded CI.
        15_000
      );
    }
  }, 60_000);

  it("still reads rules at realistic depths", () => {
    const css =
      "@media (min-width: 1px) { @supports (display: grid) { .a { .b { color: red } } } }";
    expect(readCss(css)).toEqual([
      expect.objectContaining({ selectors: [".a .b"] })
    ]);
  });
});
