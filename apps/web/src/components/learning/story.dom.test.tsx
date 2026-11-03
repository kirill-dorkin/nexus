import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useSqlRun } from "./sql/sql-client";
import { ConceptFence, StoryFence } from "./story";

vi.mock("./sql/sql-client", () => ({
  useSqlRun: vi.fn(() => ({ run: null, busy: false }))
}));
const sqlRun = vi.mocked(useSqlRun);

const story = JSON.stringify({
  title: "Знакомство",
  lines: [
    ["nika", "Привет! Сегодня разметка."],
    ["bro", "Я покажу страницу."],
    ["you", "Поехали."]
  ]
});
const shownLines = () =>
  [...document.querySelectorAll("li")].filter(
    (li) => !li.hasAttribute("data-hidden")
  ).length;

type Reveal = (entries: { isIntersecting: boolean }[]) => void;
let reveal: Reveal = () => undefined;
let observed: IntersectionObserverInit[] = [];
function observer() {
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      constructor(callback: Reveal, init: IntersectionObserverInit) {
        reveal = callback;
        observed.push(init);
      }
      observe = vi.fn();
      disconnect = vi.fn();
    }
  );
}
function reducedMotion(reduced: boolean) {
  vi.stubGlobal("matchMedia", () => ({
    matches: reduced,
    addEventListener: () => undefined,
    removeEventListener: () => undefined
  }));
}
function wait(ms: number) {
  for (let elapsed = 0; elapsed < ms; elapsed += 100) {
    act(() => {
      vi.advanceTimersByTime(100);
    });
  }
}

beforeEach(() => {
  vi.useFakeTimers();
  observed = [];
  sqlRun.mockClear();
  observer();
  reducedMotion(false);
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("story scene", () => {
  it("shows the first line and starts the chat only when scrolled into view", () => {
    render(<StoryFence source={story} fallback={null} />);
    expect(screen.getByText("Знакомство")).toBeInTheDocument();
    expect(shownLines()).toBe(1);
    expect(observed).toEqual([expect.objectContaining({ threshold: 0.4 })]);

    wait(5000);
    expect(shownLines()).toBe(1);

    act(() => reveal([{ isIntersecting: true }]));
    wait(1500);
    expect(shownLines()).toBe(2);
    wait(3000);
    expect(shownLines()).toBe(3);
  });

  it("paces each line by the length of the previous one", () => {
    render(<StoryFence source={story} fallback={null} />);
    act(() => reveal([{ isIntersecting: true }]));
    // 700 ms + 18 ms per character of «Привет! Сегодня разметка.» (25) = 1150 ms.
    wait(1100);
    expect(shownLines()).toBe(1);
    wait(100);
    expect(shownLines()).toBe(2);
  });

  it("shows the whole chat on «Показать всё», even before it scrolled into view", () => {
    render(<StoryFence source={story} fallback={null} />);
    act(() => {
      screen.getByRole("button", { name: "Показать всё" }).click();
    });
    expect(shownLines()).toBe(3);
    expect(
      screen.queryByRole("button", { name: "Показать всё" })
    ).not.toBeInTheDocument();
  });

  it("shows every line at once for reduced motion", () => {
    reducedMotion(true);
    render(<StoryFence source={story} fallback={null} />);
    expect(shownLines()).toBe(3);
  });

  it("starts at once without IntersectionObserver", () => {
    vi.stubGlobal("IntersectionObserver", undefined);
    render(<StoryFence source={story} fallback={null} />);
    wait(5000);
    expect(shownLines()).toBe(3);
  });

  it("falls back for a line by an unknown speaker", () => {
    render(
      <StoryFence
        source={JSON.stringify({ lines: [["marta", "Привет"]] })}
        fallback={<pre>код</pre>}
      />
    );
    expect(screen.getByText("код")).toBeInTheDocument();
  });
});

describe("SQL concept card", () => {
  const concept = JSON.stringify({
    name: "SELECT",
    title: "Выборка",
    what: "Читает строки.",
    why: "Чтобы видеть данные.",
    how: "SELECT name FROM products;",
    lang: "sql",
    show: 120
  });

  it("starts the database only when the example comes near the viewport", () => {
    render(<ConceptFence source={concept} fallback={null} />);
    expect(observed).toContainEqual(
      expect.objectContaining({ rootMargin: "400px 0px" })
    );
    expect(sqlRun).toHaveBeenLastCalledWith(null, expect.any(String));

    act(() => reveal([{ isIntersecting: true }]));
    expect(sqlRun).toHaveBeenLastCalledWith(
      { code: "SELECT name FROM products;" },
      expect.any(String)
    );
  });
});
