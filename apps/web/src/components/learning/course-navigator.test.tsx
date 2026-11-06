import { brand } from "@platform/brand";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { json, learnerCourse, progress } from "../../test/fixtures";

import {
  CourseNavigator,
  matchesQuery,
  type ProgramItem
} from "./course-navigator";

const lesson = (slug: string, title: string, chapter: string): ProgramItem => ({
  slug,
  title,
  chapter,
  minutes: 10,
  href: `/courses/html/${slug}`
});
const items = [
  lesson("intro", "Что такое HTML", "Начало"),
  lesson("tags", "Теги и атрибуты", "Начало"),
  lesson("links", "Ссылки", "Ссылки и медиа"),
  lesson("images", "Картинки", "Ссылки и медиа")
];
const storageKey = `${brand.slug}:visited:html`;

function renderNavigator(current = "tags") {
  render(
    <CourseNavigator
      organizationSlug="acme"
      offeringSlug="web"
      courseSlug="html"
      items={items}
      current={current}
    />
  );
  return within(screen.getByRole("navigation", { name: "Уроки курса" }));
}

const fetchMock = vi.fn<typeof fetch>();

beforeEach(() => {
  localStorage.clear();
  vi.stubEnv("NEXT_PUBLIC_API_ORIGIN", "https://api.example.test");
  // A guest by default: the program falls back to the lessons opened in this browser.
  fetchMock.mockReset();
  fetchMock.mockResolvedValue(json(401));
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("CourseNavigator", () => {
  it("shows where the learner is and marks the current lesson", () => {
    const panel = renderNavigator();
    expect(panel.getByText(/^Урок\s+из 4$/)).toHaveTextContent("Урок 2 из 4");
    expect(panel.getByRole("link", { current: "page" })).toHaveTextContent(
      "Теги и атрибуты"
    );
  });

  it("opens only the current chapter and toggles the others", async () => {
    const panel = renderNavigator();
    const media = panel.getByRole("button", { name: /Ссылки и медиа/ });
    expect(panel.getByRole("button", { name: /Начало/ })).toHaveAttribute(
      "aria-expanded",
      "true"
    );
    expect(media).toHaveAttribute("aria-expanded", "false");
    expect(
      panel.queryByRole("link", { name: /Картинки/ })
    ).not.toBeInTheDocument();

    await userEvent.click(media);
    expect(media).toHaveAttribute("aria-expanded", "true");
    expect(panel.getByRole("link", { name: /Картинки/ })).toHaveAttribute(
      "href",
      "/courses/html/images"
    );
  });

  it("records each opened lesson once and ticks the ones opened before", () => {
    localStorage.setItem(storageKey, JSON.stringify(["intro"]));
    const panel = renderNavigator("tags");

    expect(JSON.parse(localStorage.getItem(storageKey) ?? "[]")).toEqual([
      "intro",
      "tags"
    ]);
    expect(
      panel.getByRole("link", { name: /Что такое HTML/ })
    ).toHaveTextContent("уже открывали");
    expect(panel.getByRole("link", { current: "page" })).not.toHaveTextContent(
      "уже открывали"
    );
    expect(panel.getByText("Открыто уроков: 2 из 4")).toBeInTheDocument();
  });

  it("survives unreadable storage", () => {
    localStorage.setItem(storageKey, "{broken");
    const panel = renderNavigator();
    expect(panel.getByText("Открыто уроков: 1 из 4")).toBeInTheDocument();
  });

  it("searches every chapter, ignoring case and ё, and can be cleared", async () => {
    const panel = renderNavigator();
    const search = panel.getByRole("searchbox", {
      name: "Найти урок по названию"
    });

    await userEvent.type(search, "КАРТИНКИ");
    expect(panel.getByRole("status")).toHaveTextContent("Найдено: 1");
    expect(panel.getByRole("link", { name: /Картинки/ })).toBeInTheDocument();
    expect(panel.queryByRole("link", { name: /Теги/ })).not.toBeInTheDocument();

    await userEvent.clear(search);
    await userEvent.type(search, "нет такого");
    expect(panel.getByRole("status")).toHaveTextContent("Ничего не нашлось");

    await userEvent.click(
      panel.getByRole("button", { name: "Очистить поиск" })
    );
    expect(search).toHaveValue("");
    expect(panel.getByRole("link", { current: "page" })).toBeInTheDocument();
  });

  it("opens the program as a modal sheet on narrow screens", async () => {
    renderNavigator();
    await userEvent.click(
      screen.getByRole("button", { name: /Программа 2\/4/ })
    );

    const sheet = screen.getByRole("dialog", { name: "Программа курса" });
    expect(sheet).toHaveAttribute("open");
    await userEvent.click(
      within(sheet).getByRole("button", { name: "Закрыть программу" })
    );
    expect(sheet).not.toHaveAttribute("open");
  });
});

describe("program search", () => {
  const item = {
    title: "Помощники итераторов",
    chapter: "Массивы и итераторы полностью"
  };
  it("matches every word, ignoring case, ё and word order", () => {
    expect(matchesQuery(item, "ИТЕРАТОР помощ")).toBe(true);
    expect(matchesQuery({ title: "Ёлка" }, "елка")).toBe(true);
    expect(matchesQuery(item, "итератор строки")).toBe(false);
  });
  it("finds lessons by their chapter name too, and an empty query matches all", () => {
    expect(matchesQuery(item, "массивы")).toBe(true);
    expect(matchesQuery(item, "   ")).toBe(true);
  });

  it("ticks lessons with a passed test and marks the next one for a learner", async () => {
    fetchMock.mockResolvedValue(
      json(200, learnerCourse({ progress: progress() }))
    );
    const panel = renderNavigator("intro");
    expect(
      await panel.findByText("Пройдено уроков: 1 из 4")
    ).toBeInTheDocument();
    expect(panel.getByRole("link", { name: /Что такое HTML/ })).toHaveAttribute(
      "data-visited"
    );
    expect(
      panel.getByRole("link", { name: /Теги и атрибуты/ })
    ).toHaveTextContent("Следующий");
  });

  it("refreshes the ticks after a checked quiz", async () => {
    fetchMock.mockResolvedValueOnce(
      json(200, learnerCourse({ progress: progress() }))
    );
    const panel = renderNavigator("links");
    await panel.findByText("Пройдено уроков: 1 из 4");
    fetchMock.mockResolvedValue(
      json(
        200,
        learnerCourse({
          progress: progress({
            nextLessonSlug: "links",
            lessons: [
              ...progress().lessons.slice(0, 1),
              { ...itemAtTags(), requiredPassed: true }
            ]
          })
        })
      )
    );
    window.dispatchEvent(new Event("learning-progress-changed"));
    expect(
      await panel.findByText("Пройдено уроков: 2 из 4")
    ).toBeInTheDocument();
  });
});

function itemAtTags() {
  const tags = progress().lessons[1];
  if (!tags) throw new Error("fixture changed");
  return tags;
}
