import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import {
  DiscoveryCourses,
  DiscoveryRows,
  DiscoveryLoading,
} from "./home-discovery";
import { loadLearningCatalog } from "../../lib/public-learning";
import { courseUrl } from "../../lib/public-learning-routes";
import type { PublicLearningCourse } from "@platform/contracts";

vi.mock("../../lib/public-learning", () => ({
  loadLearningCatalog: vi.fn(),
  courseUrl: (course: PublicLearningCourse) => courseUrl(course),
}));
const course: PublicLearningCourse = {
  organization: { slug: "test-only", name: "Тестовые материалы" },
  offering: { slug: "course", name: "Тестовый курс" },
  course: {
    title: "Длинное название тестового курса",
    description: "Первая цельная фраза. Подробности в программе.",
    lessons: [
      { slug: "first", title: "Первый урок", summary: "", durationMinutes: 25 },
    ],
  },
};

describe("public home discovery", () => {
  it("keeps loading, genuine empty and failed reads distinct without leaking backend details", async () => {
    expect(renderToStaticMarkup(DiscoveryLoading())).toContain(
      'aria-busy="true"',
    );
    vi.mocked(loadLearningCatalog).mockResolvedValueOnce({ courses: [] });
    const empty = renderToStaticMarkup(await DiscoveryCourses());
    expect(empty).toContain("Курсы готовятся к открытию");
    expect(empty).not.toContain("Не удалось загрузить курсы");
    vi.mocked(loadLearningCatalog).mockRejectedValueOnce(
      new Error("private backend detail"),
    );
    const error = renderToStaticMarkup(await DiscoveryCourses());
    expect(error).toContain("Не удалось загрузить курсы");
    expect(error).toContain("Попробовать снова");
    expect(error).not.toContain("private backend detail");
    expect(error).not.toContain("Длинное название");
  });
  it("uses real metadata and canonical course routes even without art or description", () => {
    const html = renderToStaticMarkup(DiscoveryRows({ courses: [course] }));
    expect(html).toContain('href="/learn/test-only/course"');
    expect(html).toContain("1 урок");
    expect(html).toContain("25 мин");
    expect(html).toContain("Первая цельная фраза.");
    expect(html).not.toContain("Подробности в программе.");
    expect(html).not.toContain("<img");
    const noDescription = renderToStaticMarkup(
      DiscoveryRows({
        courses: [{ ...course, course: { ...course.course, description: "" } }],
      }),
    );
    expect(noDescription).toContain("Посмотреть программу");
    expect(noDescription).not.toContain("<p></p>");
  });
});
