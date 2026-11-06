import { describe, expect, it, vi } from "vitest";

import { keysFor, pressKey } from "./code-keys";

const area = (value: string, at: number) => {
  const el = document.createElement("textarea");
  el.value = value;
  el.setSelectionRange(at, at);
  return el;
};

describe("code keys", () => {
  it("offers the common keys first, then the language's characters", () => {
    const html = keysFor("html").map((k) => k.label);
    expect(html.slice(0, 3)).toEqual(["⇥", "←", "→"]);
    expect(html).toContain("</");
    expect(keysFor("sql").map((k) => k.label)).toContain("SELECT");
    expect(keysFor("javascript").map((k) => k.label)).toContain("=>");
    expect(keysFor("unknown").map((k) => k.label)).toContain("<");
  });

  it("types at the caret and reports the new value", () => {
    const el = area("ab", 1);
    const onChange = vi.fn();
    pressKey(el, { label: "<", text: "<" }, onChange);
    expect(el.value).toBe("a<b");
    expect(onChange).toHaveBeenCalledWith("a<b");
  });

  it("moves the caret without typing, within the text", () => {
    const el = area("ab", 0);
    const onChange = vi.fn();
    pressKey(el, { label: "←", move: -1 }, onChange);
    expect(el.selectionStart).toBe(0);
    pressKey(el, { label: "→", move: 1 }, onChange);
    expect(el.selectionStart).toBe(1);
    expect(onChange).not.toHaveBeenCalled();
  });
});
