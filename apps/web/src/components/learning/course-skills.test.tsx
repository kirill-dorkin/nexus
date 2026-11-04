import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { browserApiRequest } from "../../lib/public-api";
import { courseSkills, json } from "../../test/fixtures";
import { CourseSkills, CourseSkillsCount } from "./course-skills";
import { masteredSkillCount, skillStateLabel } from "./skill-labels";

vi.mock("../../lib/public-api", () => ({
  browserApiRequest: vi.fn()
}));
const api = vi.mocked(browserApiRequest);
const skillsPath = "/v1/me/learning/acme/web/skills";

beforeEach(() => {
  api.mockReset();
});

describe("skill labels", () => {
  it("names every state without technical terms", () => {
    const [assessed, started, unobserved] = courseSkills().skills;
    expect(skillStateLabel(assessed!)).toBe("Освоено на 85 %");
    expect(skillStateLabel(started!)).toBe("Начали");
    expect(skillStateLabel(unobserved!)).toBe("Ещё не проверяли");
  });

  it("counts a skill as mastered only from the mastery target on", () => {
    const skills = courseSkills().skills;
    expect(masteredSkillCount(skills)).toBe(1);
    const [assessed] = skills;
    if (assessed?.state !== "assessed") throw new Error("fixture changed");
    expect(masteredSkillCount([{ ...assessed, masteryScore: 0.79 }])).toBe(0);
    expect(masteredSkillCount([{ ...assessed, masteryScore: 0.8 }])).toBe(1);
  });
});

describe("CourseSkills", () => {
  it("lists each skill with its state and a bar for assessed ones", async () => {
    api.mockResolvedValueOnce(json(200, courseSkills()));
    render(<CourseSkills organizationSlug="acme" offeringSlug="web" />);

    expect(
      await screen.findByRole("heading", { name: "Навыки курса" })
    ).toBeInTheDocument();
    expect(await screen.findByText("Освоено на 85 %")).toBeInTheDocument();
    expect(screen.getByText("Начали")).toBeInTheDocument();
    expect(screen.getByText("Ещё не проверяли")).toBeInTheDocument();
    const bar = screen.getByRole("progressbar", {
      name: "Структура документа: Освоено на 85 %"
    });
    expect(bar).toHaveAttribute("value", "85");
    expect(screen.getAllByRole("progressbar")).toHaveLength(1);
    expect(api).toHaveBeenCalledWith(skillsPath, expect.anything());
  });

  it("shows nothing to an anonymous visitor", async () => {
    api.mockResolvedValueOnce(json(401));
    const { container } = render(
      <CourseSkills organizationSlug="acme" offeringSlug="web" />
    );
    await vi.waitFor(() => {
      expect(container).toBeEmptyDOMElement();
    });
  });

  it("hides a course without skills and explains a failed load", async () => {
    api.mockResolvedValueOnce(json(200, { skills: [] }));
    const empty = render(
      <CourseSkills organizationSlug="acme" offeringSlug="web" />
    );
    await vi.waitFor(() => {
      expect(empty.container).toBeEmptyDOMElement();
    });
    empty.unmount();

    api.mockResolvedValueOnce(json(500));
    render(<CourseSkills organizationSlug="acme" offeringSlug="web" />);
    expect(
      await screen.findByText(/Не удалось загрузить навыки/)
    ).toBeInTheDocument();
  });
});

describe("CourseSkillsCount", () => {
  it("summarizes mastered skills of one course", async () => {
    api.mockResolvedValueOnce(json(200, courseSkills()));
    render(<CourseSkillsCount organizationSlug="acme" offeringSlug="web" />);
    expect(
      await screen.findByText("Освоено навыков: 1 из 3")
    ).toBeInTheDocument();
  });

  it("stays silent when skills are unavailable", async () => {
    api.mockResolvedValueOnce(json(404));
    const { container } = render(
      <CourseSkillsCount organizationSlug="acme" offeringSlug="web" />
    );
    await vi.waitFor(() => {
      expect(api).toHaveBeenCalledOnce();
    });
    expect(container).toBeEmptyDOMElement();
  });
});
