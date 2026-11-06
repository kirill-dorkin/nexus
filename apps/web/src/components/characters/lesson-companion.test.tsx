import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { json } from "../../test/fixtures";
import { SKILL_MAP } from "../../lib/skill-map/skill-map";
import { LessonCompanion } from "./lesson-companion";

const fetchMock = vi.fn<typeof fetch>();
const html = SKILL_MAP.characters.find((c) => c.slug === "html");

/** The skills endpoint answer with the first `n` HTML skills confirmed today. */
function confirmed(n: number) {
  const today = new Date().toISOString().slice(0, 10);
  return {
    skills: (html?.branches ?? [])
      .flatMap((branch) => branch.skills)
      .slice(0, n)
      .map((skill) => ({ skillKey: skill.key, confirmedDays: [today] }))
  };
}

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_API_ORIGIN", "https://api.example.test");
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("LessonCompanion", () => {
  it("asks a guest to sign in so tests level the character", async () => {
    fetchMock.mockResolvedValue(json(401));
    render(<LessonCompanion courseSlug="html" />);
    expect(
      await screen.findByText(
        "Войдите, чтобы ваши тесты прокачивали персонажа."
      )
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "HTML" })).toHaveAttribute(
      "href",
      "/characters/html"
    );
  });

  it("shows the way to the next rank and the gain after a checked quiz", async () => {
    fetchMock.mockResolvedValue(json(200, confirmed(0)));
    render(<LessonCompanion courseSlug="html" />);
    expect(await screen.findByText(/До ранга «Ученик»/)).toBeInTheDocument();
    fetchMock.mockResolvedValue(json(200, confirmed(20)));
    act(() => {
      window.dispatchEvent(new Event("learning-progress-changed"));
    });
    expect(await screen.findByRole("status")).toHaveTextContent(
      /Новый ранг|к уровню за этот урок/
    );
  });

  it("stays out of courses without a character body", () => {
    fetchMock.mockResolvedValue(json(401));
    const { container } = render(<LessonCompanion courseSlug="design" />);
    expect(container).toBeEmptyDOMElement();
  });
});
