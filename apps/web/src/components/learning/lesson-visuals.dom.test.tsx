import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { VisualBlock } from "./lesson-visuals";

const typing = JSON.stringify({
  kind: "typing",
  title: "Emmet",
  input: "h1+p",
  key: "Tab",
  output: "<h1></h1>\n<p></p>",
  caption: "Две строки разметки",
  parts: [
    { text: "h1", label: "заголовок" },
    { text: "+", label: "рядом" },
    { text: "p", label: "абзац" }
  ]
});

function matchMedia(reduced: boolean) {
  vi.stubGlobal("matchMedia", () => ({
    matches: reduced,
    addEventListener: () => undefined,
    removeEventListener: () => undefined
  }));
}
const parts = () =>
  [...document.querySelectorAll("ol[aria-hidden] li[data-state]")].filter(
    (li) => li.querySelector("code")
  );
const editor = () => document.querySelector("pre code");
/** Advances in small steps: each frame schedules the next one after React re-renders. */
function play(ms: number) {
  for (let elapsed = 0; elapsed < ms; elapsed += 50) {
    act(() => {
      vi.advanceTimersByTime(Math.min(50, ms - elapsed));
    });
  }
}

beforeEach(() => {
  vi.useFakeTimers();
  // No IntersectionObserver: the animation counts as visible right away.
  vi.stubGlobal("IntersectionObserver", undefined);
  matchMedia(false);
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("typing demo", () => {
  it("types the abbreviation part by part, presses the key and shows the result", () => {
    render(<VisualBlock source={typing} fallback={null} />);
    expect(screen.getByText("Emmet")).toBeInTheDocument();
    expect(
      screen.getByText(/Ввод «h1\+p», затем клавиша Tab\. Результат:/)
    ).toBeInTheDocument();
    expect(parts().map((li) => li.getAttribute("data-state"))).toEqual([
      "idle",
      "idle",
      "idle"
    ]);

    play(700);
    expect(editor()).toHaveTextContent("h");
    expect(parts()[0]).toHaveAttribute("data-state", "active");

    play(95 + 190);
    expect(editor()).toHaveTextContent("h1+");
    expect(parts().map((li) => li.getAttribute("data-state"))).toEqual([
      "done",
      "done",
      "idle"
    ]);

    play(2000);
    expect(editor()).toHaveTextContent("<h1></h1>");
    expect(
      parts().every((li) => li.getAttribute("data-state") === "done")
    ).toBe(true);
    expect(
      screen.getByRole("button", { name: /Повторить/ })
    ).toBeInTheDocument();
  });

  it("pauses and resumes", () => {
    render(<VisualBlock source={typing} fallback={null} />);
    fireEvent.click(screen.getByRole("button", { name: "Пауза анимации" }));
    play(5000);
    expect(editor()?.textContent).not.toContain("h");

    fireEvent.click(
      screen.getByRole("button", { name: "Продолжить анимацию" })
    );
    play(5000);
    expect(editor()).toHaveTextContent("<h1></h1>");
  });

  it("replays from the start", () => {
    render(<VisualBlock source={typing} fallback={null} />);
    play(5000);
    fireEvent.click(screen.getByRole("button", { name: /Повторить/ }));
    expect(editor()?.textContent).not.toContain("<h1>");
    play(5000);
    expect(editor()).toHaveTextContent("<h1></h1>");
  });

  it("shows the result at once, without controls, for reduced motion", () => {
    matchMedia(true);
    render(<VisualBlock source={typing} fallback={null} />);
    expect(editor()).toHaveTextContent("<h1></h1>");
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("waits until the animation scrolls into view", () => {
    let reveal: (entries: { isIntersecting: boolean }[]) => void = () =>
      undefined;
    vi.stubGlobal(
      "IntersectionObserver",
      class {
        constructor(callback: typeof reveal) {
          reveal = callback;
        }
        observe = vi.fn();
        disconnect = vi.fn();
      }
    );
    render(<VisualBlock source={typing} fallback={null} />);
    play(5000);
    expect(editor()?.textContent).not.toContain("h");
    act(() => reveal([{ isIntersecting: true }]));
    play(5000);
    expect(editor()).toHaveTextContent("<h1></h1>");
  });
});

describe("diagrams", () => {
  it("draws the DOM tree of a fragment from inert parsing", () => {
    render(
      <VisualBlock
        source={JSON.stringify({
          kind: "dom",
          html: "<p>Привет, <b>мир</b><script>alert(1)</script></p>"
        })}
        fallback={null}
      />
    );
    const tree = screen.getByLabelText("DOM-дерево");
    expect(tree).toHaveTextContent("body");
    expect(tree).toHaveTextContent("p");
    expect(tree).toHaveTextContent("b");
    expect(tree).toHaveTextContent("мир");
    expect(screen.queryByText("Строим дерево…")).not.toBeInTheDocument();
  });

  it("draws a whole document from its html element", () => {
    render(
      <VisualBlock
        source={JSON.stringify({
          kind: "dom",
          html: "<!doctype html><html><head><title>T</title></head><body></body></html>"
        })}
        fallback={null}
      />
    );
    expect(screen.getByLabelText("DOM-дерево")).toHaveTextContent("head");
  });

  it("falls back to the source for an unknown visual", () => {
    render(
      <VisualBlock source='{"kind":"chart"}' fallback={<pre>исходник</pre>} />
    );
    expect(screen.getByText("исходник")).toBeInTheDocument();
  });
});
