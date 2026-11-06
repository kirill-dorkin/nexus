import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { json, learnerCourse, progress } from "../../test/fixtures";
import { LessonOrderHint } from "./lesson-order-hint";

const lessons = [
  { slug: "intro", title: "Что такое HTML" },
  { slug: "tags", title: "Теги" },
  { slug: "links", title: "Ссылки" }
];
const hrefFor = Object.fromEntries(
  lessons.map((l) => [l.slug, `/courses/html/${l.slug}`])
);
const fetchMock = vi.fn<typeof fetch>();

function renderHint(current: string) {
  return render(
    <LessonOrderHint
      organizationSlug="acme"
      offeringSlug="web"
      lessons={lessons}
      current={current}
      hrefFor={hrefFor}
    />
  );
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

describe("LessonOrderHint", () => {
  it("points a learner who jumped ahead back to the next lesson", async () => {
    fetchMock.mockResolvedValue(
      json(200, learnerCourse({ progress: progress() }))
    );
    renderHint("links");
    expect(await screen.findByText("Вы забежали вперёд")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Теги" })).toHaveAttribute(
      "href",
      "/courses/html/tags"
    );
  });

  it("stays silent on the next lesson, a passed one and for guests", async () => {
    fetchMock.mockResolvedValue(
      json(200, learnerCourse({ progress: progress() }))
    );
    const next = renderHint("tags");
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(screen.queryByText("Вы забежали вперёд")).not.toBeInTheDocument();
    next.unmount();

    fetchMock.mockResolvedValue(json(401));
    renderHint("links");
    await vi.waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(2);
      expect(screen.queryByText("Вы забежали вперёд")).not.toBeInTheDocument();
    });
  });
});
