import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { HomeCatalog } from "./home-catalog";
import { loadLearningCatalog } from "../../lib/public-learning";

vi.mock("../../lib/public-learning", () => ({
  loadLearningCatalog: vi.fn(),
  courseUrl: vi.fn()
}));

describe("homepage catalog read states", () => {
  it("distinguishes an unavailable API from a genuinely empty catalog", async () => {
    vi.mocked(loadLearningCatalog).mockResolvedValueOnce({ courses: [] });
    const empty = renderToStaticMarkup(await HomeCatalog());
    expect(empty).toContain("Курсы готовятся к открытию");
    expect(empty).not.toContain("Каталог временно недоступен");

    vi.mocked(loadLearningCatalog).mockRejectedValueOnce(
      new Error("private backend detail")
    );
    const unavailable = renderToStaticMarkup(await HomeCatalog());
    expect(unavailable).toContain("Каталог временно недоступен");
    expect(unavailable).toContain("Попробовать снова");
    expect(unavailable).toContain('type="button"');
    expect(unavailable).not.toContain("Курсы готовятся к открытию");
    expect(unavailable).not.toContain("private backend detail");
  });
});
