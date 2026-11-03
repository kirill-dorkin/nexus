import { brand } from "@platform/brand";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useViewer } from "../../lib/use-viewer";
import { SaveProgressHint, SignupNudge } from "./signup-nudge";

vi.mock("../../lib/use-viewer", () => ({ useViewer: vi.fn() }));
vi.mock("next/navigation", () => ({ usePathname: () => "/courses/html/tags" }));
const viewer = vi.mocked(useViewer);

/** Moves the clock in 30-second steps while the learner keeps interacting. */
function learnFor(seconds: number) {
  for (let s = 0; s < seconds; s += 30) {
    act(() => {
      fireEvent.keyDown(window);
      vi.advanceTimersByTime(30_000);
    });
  }
}
const nudge = () =>
  screen.queryByRole("complementary", { name: "Сохранить прогресс" });

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-11-03T10:00:00Z"));
  localStorage.clear();
  viewer.mockReturnValue("anonymous");
});
afterEach(() => {
  vi.useRealTimers();
});

describe("SignupNudge", () => {
  it("never appears for a signed-in learner", () => {
    viewer.mockReturnValue("signed-in");
    render(<SignupNudge returnTo="/courses/html/tags" />);
    learnFor(30 * 60);
    expect(nudge()).not.toBeInTheDocument();
  });

  it("appears after five active minutes and links to registration", () => {
    render(<SignupNudge returnTo="/courses/html/tags" />);
    learnFor(4 * 60);
    expect(nudge()).not.toBeInTheDocument();
    learnFor(60);

    expect(nudge()).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent(
      "Ты учишься уже 5 мин."
    );
    expect(
      screen.getByRole("link", { name: "Создать аккаунт" })
    ).toHaveAttribute(
      "href",
      `/login?returnTo=${encodeURIComponent("/courses/html/tags")}&mode=register`
    );
  });

  it("counts solved challenges with the right Russian plural", () => {
    for (const id of ["a", "b"])
      localStorage.setItem(`${brand.slug}:challenge:${id}`, "1");
    render(<SignupNudge returnTo="/" />);
    learnFor(5 * 60);
    expect(screen.getByRole("status")).toHaveTextContent(
      "У тебя уже 2 решённых задания."
    );
  });

  it("does not count idle time", () => {
    render(<SignupNudge returnTo="/" />);
    act(() => {
      vi.advanceTimersByTime(30 * 60_000);
    });
    expect(nudge()).not.toBeInTheDocument();
  });

  it("waits while the learner is typing", () => {
    render(
      <>
        <textarea aria-label="Код" />
        <SignupNudge returnTo="/" />
      </>
    );
    screen.getByRole("textbox", { name: "Код" }).focus();
    learnFor(6 * 60);
    expect(nudge()).not.toBeInTheDocument();
  });

  it("snoozes for fifteen minutes after «Позже» and stops after three a day", () => {
    render(<SignupNudge returnTo="/" />);
    learnFor(5 * 60);
    fireEvent.click(screen.getByRole("button", { name: "Позже" }));
    expect(nudge()).not.toBeInTheDocument();

    learnFor(14 * 60);
    expect(nudge()).not.toBeInTheDocument();
    learnFor(60);
    expect(nudge()).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Закрыть" }));

    learnFor(15 * 60);
    fireEvent.click(screen.getByRole("button", { name: "Позже" }));
    learnFor(60 * 60);
    expect(nudge()).not.toBeInTheDocument();
  });
});

describe("SaveProgressHint", () => {
  it("tells an anonymous learner where solutions are kept", () => {
    render(<SaveProgressHint />);
    expect(
      screen.getByText(/хранятся только в этом браузере/)
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Создай аккаунт" })
    ).toHaveAttribute(
      "href",
      `/login?returnTo=${encodeURIComponent("/courses/html/tags")}&mode=register`
    );
  });

  it("is silent for a signed-in learner", () => {
    viewer.mockReturnValue("signed-in");
    const { container } = render(<SaveProgressHint />);
    expect(container).toBeEmptyDOMElement();
  });
});
