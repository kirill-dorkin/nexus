// @vitest-environment happy-dom
import { describe, expect, it } from "vitest";
import { parseChallenge } from "./challenge";
import { guardLoops, runnerDocument } from "./js-runner";
import { runInWindow } from "./runner-harness.test-utils";

describe("guardLoops", () => {
  it("guards braced for, while and do bodies", () => {
    expect(guardLoops("for (let i = 0; i < 3; i++) { x(); }")).toBe("for (let i = 0; i < 3; i++) {if(__nexusLoop())break; x(); }");
    expect(guardLoops("while (a) {b()}")).toBe("while (a) {if(__nexusLoop())break;b()}");
    expect(guardLoops("do { n++ } while (n < 3);")).toBe("do {if(__nexusLoop())break; n++ } while (n < 3);");
  });
  it("leaves strings, comments, identifiers and brace-less loops alone", () => {
    const code = 'const format = "for (;;) {"; // while (1) {\nfor (const x of xs) f(x); doIt();';
    expect(guardLoops(code)).toBe(code);
  });
});

describe("runner sandbox", () => {
  it("closes the network and never asks for same-origin", () => {
    const doc = runnerDocument({ code: "1", lang: "js", mode: "preview", token: "t" });
    expect(doc).toContain("default-src 'none'");
    expect(doc).not.toMatch(/allow-same-origin/);
  });

  it("captures console output, evaluates checks with await and sees top-level bindings", async () => {
    const { results, logs } = await runInWindow({
      lang: "js",
      page: '<button id="add">+</button><span id="n">0</span>',
      code: 'let count = 0;\nconst add = document.querySelector("#add");\nadd.addEventListener("click", () => { count++; document.querySelector("#n").textContent = count; });\nconsole.log("Привет", [1, 2], { a: 1 });',
      checks: [
        { log: "привет [1, 2] { a: 1 }" },
        { js: "count === 0" },
        { js: '(document.querySelector("#add").click(), document.querySelector("#n").textContent === "1")' },
        { js: "await wait(10) || true" },
        { log: "нет такого" }
      ]
    });
    expect(logs[0]).toEqual({ level: "log", text: "Привет [1, 2] { a: 1 }" });
    expect(results).toEqual([true, true, true, true, false]);
  });

  it("serves the offline teaching API to fetch()", async () => {
    const { results } = await runInWindow({
      lang: "js",
      code: 'async function load() { const res = await fetch("/api/menu"); window.menu = await res.json(); }\nload();',
      checks: [{ js: "await wait(200) || window.menu.length === 6" }]
    });
    expect(results).toEqual([true]);
  });

  it("stops an endless loop instead of freezing, and reports the error", async () => {
    const { results, logs } = await runInWindow({
      lang: "js",
      code: "let i = 0;\nwhile (i < 5) { }\nwindow.after = true;",
      checks: [{ js: "window.after === true" }]
    });
    expect(results).toEqual([false]);
    expect(logs.some((l) => l.level === "error" && /бесконечный/.test(l.text))).toBe(true);
  }, 10000);
});

describe("runnable challenge specs", () => {
  const base = { title: "t", task: "x", start: "", solution: "" };
  it("accepts js and log checks, a js language and a fixed page", () => {
    expect(parseChallenge(JSON.stringify({ ...base, lang: "js", page: "<p></p>", checks: [{ label: "a", js: "1 === 1" }, { label: "b", log: "hi" }] }))).not.toBeNull();
  });
  it("rejects a page without js, a script terminator in a check and mixed check kinds", () => {
    expect(parseChallenge(JSON.stringify({ ...base, page: "<p></p>", checks: [{ label: "a", js: "1" }] }))).toBeNull();
    expect(parseChallenge(JSON.stringify({ ...base, lang: "js", checks: [{ label: "a", js: "'</script>'" }] }))).toBeNull();
    expect(parseChallenge(JSON.stringify({ ...base, lang: "js", checks: [{ label: "a", js: "1", log: "x" }] }))).toBeNull();
  });
});
