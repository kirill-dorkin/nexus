import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { browserApiRequest } from "../../../lib/public-api";
import {
  courseSkills,
  json,
  learnerCourse,
  progress
} from "../../../test/fixtures";
import { MyLearning } from "./my-learning";

vi.mock("../../../lib/public-api", () => ({
  browserApiRequest: vi.fn()
}));
const api = vi.mocked(browserApiRequest);

const cursor = "0195d9a8-6c8e-7000-8000-0000000000d1";
const active = {
  customerEntryPolicy: "open",
  membershipStatus: "active"
} as const;
const html = learnerCourse({
  entry: { ...active, enrollmentStatus: "active" },
  progress: progress()
});
const css = learnerCourse({
  offering: { slug: "css", name: "CSS" },
  course: { ...html.course, slug: "css", title: "CSS с нуля" },
  entry: { ...active, enrollmentStatus: "completed" },
  progress: progress({
    allRequiredPassed: true,
    percentage: 100,
    passedRequired: 4,
    nextLessonSlug: null
  })
});

function routes(table: Record<string, Response[]>) {
  api.mockImplementation((path) => {
    const next = table[path]?.shift();
    return next
      ? Promise.resolve(next)
      : Promise.reject(new Error(`Unexpected ${path}`));
  });
}

beforeEach(() => {
  api.mockReset();
});

describe("MyLearning", () => {
  it("asks an anonymous visitor to sign in and come back here", async () => {
    routes({ "/v1/me/learning": [json(401)] });
    render(<MyLearning />);
    expect(await screen.findByRole("link", { name: "Войти" })).toHaveAttribute(
      "href",
      `/login?returnTo=${encodeURIComponent("/me/learning")}`
    );
  });

  it("suggests choosing a course when the learner has none", async () => {
    routes({
      "/v1/me/learning": [json(200, { courses: [], nextCursor: null })]
    });
    render(<MyLearning />);
    expect(
      await screen.findByRole("link", { name: /Выбрать курс/ })
    ).toHaveAttribute("href", "/courses");
  });

  it("lists courses with a summary and the next step for each", async () => {
    routes({
      "/v1/me/learning": [
        json(200, { courses: [html, css], nextCursor: null })
      ],
      "/v1/me/learning/acme/web/skills": [json(200, courseSkills())],
      "/v1/me/learning/acme/css/skills": [json(200, { skills: [] })]
    });
    render(<MyLearning />);

    const summary = await screen.findByLabelText("Сводка обучения");
    expect(summary).toHaveTextContent("1в процессе");
    expect(summary).toHaveTextContent("1завершено");

    const [first, second] = screen.getAllByRole("listitem");
    expect(
      within(first!).getByRole("link", { name: /Продолжить/ })
    ).toHaveAttribute("href", "/learn/acme/web/tags");
    expect(within(second!).getByText("Обучение завершено")).toBeInTheDocument();
    expect(
      within(second!).getByRole("link", { name: /Вернуться к материалам/ })
    ).toHaveAttribute("href", "/learn/acme/css/intro");
    expect(
      await within(first!).findByText("Освоено навыков: 1 из 3")
    ).toBeInTheDocument();
    expect(within(second!).queryByText(/Освоено навыков/)).toBeNull();
  });

  it("loads the next page without duplicating a course", async () => {
    routes({
      "/v1/me/learning": [json(200, { courses: [html], nextCursor: cursor })],
      [`/v1/me/learning?after=${cursor}`]: [
        json(200, { courses: [html, css], nextCursor: null })
      ]
    });
    render(<MyLearning />);
    await userEvent.click(
      await screen.findByRole("button", { name: "Показать ещё" })
    );

    expect(
      await screen.findByRole("heading", { name: "CSS с нуля" })
    ).toBeInTheDocument();
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
    expect(
      screen.queryByRole("button", { name: "Показать ещё" })
    ).not.toBeInTheDocument();
  });

  it("offers a retry when the list cannot be loaded", async () => {
    routes({
      "/v1/me/learning": [
        json(503),
        json(200, { courses: [html], nextCursor: null })
      ]
    });
    render(<MyLearning />);
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Не удалось загрузить обучение."
    );

    await userEvent.click(
      screen.getByRole("button", { name: "Повторить загрузку" })
    );
    expect(
      await screen.findByRole("heading", { name: "HTML с нуля" })
    ).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("signs out and shows the anonymous state", async () => {
    routes({
      "/v1/me/learning": [json(200, { courses: [html], nextCursor: null })],
      "/v1/auth/logout": [json(204)]
    });
    render(<MyLearning />);
    await userEvent.click(await screen.findByRole("button", { name: "Выйти" }));
    expect(
      await screen.findByText("Войдите, чтобы увидеть свои курсы.")
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "HTML с нуля" })
    ).not.toBeInTheDocument();
  });
});
