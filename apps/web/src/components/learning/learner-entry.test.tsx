import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { browserApiRequest } from "../../lib/public-api";
import {
  courseSkills,
  json,
  learnerCourse,
  progress
} from "../../test/fixtures";
import { itemAt } from "../../lib/item-at";
import { HOME_ORGANIZATION_SLUG } from "../../lib/public-learning-routes";
import { CourseProgress } from "./course-progress";
import { LearnerEntry } from "./learner-entry";

vi.mock("../../lib/public-api", () => ({
  browserApiRequest: vi.fn()
}));
const api = vi.mocked(browserApiRequest);

const learningPath = "/v1/me/learning/acme/web";
const joinPath = "/v1/public/organizations/acme/memberships/me";
const enrollPath = `${learningPath}/enrollment`;
const skillsPath = `${learningPath}/skills`;

/** Queues responses per request path; an unexpected request fails the test. */
function routes(table: Record<string, Response[]>) {
  api.mockImplementation((path) => {
    const next = table[path]?.shift();
    return next
      ? Promise.resolve(next)
      : Promise.reject(new Error(`Unexpected ${path}`));
  });
}
function renderEntry(lessonSlug?: string) {
  render(
    <LearnerEntry
      organizationSlug="acme"
      offeringSlug="web"
      courseSlug="html"
      {...(lessonSlug ? { lessonSlug } : {})}
    />
  );
}

beforeEach(() => {
  api.mockReset();
});

describe("LearnerEntry", () => {
  it("invites an anonymous visitor to sign in and come back to the lesson", async () => {
    routes({ [learningPath]: [json(401)] });
    renderEntry("tags");
    expect(
      await screen.findByRole("link", { name: "Войти и сохранить обучение" })
    ).toHaveAttribute(
      "href",
      `/login?returnTo=${encodeURIComponent("/learn/acme/web/tags")}`
    );
  });

  it("starts a free course: joins the organization, then enrolls", async () => {
    const enrolled = learnerCourse({
      entry: {
        customerEntryPolicy: "open",
        membershipStatus: "active",
        enrollmentStatus: "active"
      },
      progress: progress()
    });
    routes({
      [learningPath]: [json(200, learnerCourse())],
      [joinPath]: [json(200)],
      [enrollPath]: [json(201, enrolled)],
      [skillsPath]: [json(200, courseSkills())]
    });
    renderEntry();

    expect(
      await screen.findByText(/вступаете в организацию «Acme»/)
    ).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Начать курс" }));

    expect(
      await screen.findByText(
        "Вы записаны на курс. Результаты практики будут сохраняться."
      )
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Продолжить обучение" })
    ).toHaveAttribute("href", "/learn/acme/web/tags");
    // Skills appear once the enrollment exists, on the course page only.
    expect(await screen.findByText("Освоено на 85 %")).toBeInTheDocument();
    expect(api.mock.calls.map(([path]) => path)).toEqual([
      learningPath,
      joinPath,
      enrollPath,
      skillsPath
    ]);
  });

  it("explains changed access and reloads the state after a failed enrollment", async () => {
    routes({
      [learningPath]: [json(200, learnerCourse()), json(200, learnerCourse())],
      [joinPath]: [json(200)],
      [enrollPath]: [json(409)]
    });
    renderEntry();
    await userEvent.click(
      await screen.findByRole("button", { name: "Начать курс" })
    );

    await waitFor(() => {
      expect(
        api.mock.calls.filter(([path]) => path === learningPath)
      ).toHaveLength(2);
    });
    // The refreshed state must not erase the reason the second step failed.
    expect(
      await screen.findByRole("button", { name: "Начать курс" })
    ).toBeEnabled();
    expect(screen.getByRole("alert")).toHaveTextContent("Доступ изменился.");
  });

  it("tells a visitor of a closed organization to ask for an invitation", async () => {
    routes({
      [learningPath]: [
        json(
          200,
          learnerCourse({
            entry: {
              customerEntryPolicy: "closed",
              membershipStatus: "none",
              enrollmentStatus: null
            }
          })
        )
      ]
    });
    renderEntry();
    expect(await screen.findByText(/за приглашением/)).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("lets an active member enroll without joining again", async () => {
    const member = learnerCourse({
      entry: {
        customerEntryPolicy: "closed",
        membershipStatus: "active",
        enrollmentStatus: null
      }
    });
    routes({
      [learningPath]: [json(200, member)],
      [enrollPath]: [json(201, { ...member, progress: progress() })]
    });
    renderEntry();
    await userEvent.click(
      await screen.findByRole("button", {
        name: "Записаться на бесплатный курс"
      })
    );
    expect(await screen.findByRole("status")).toHaveTextContent(
      "Вы записаны на курс."
    );
    expect(api.mock.calls.map(([path]) => path)).not.toContain(joinPath);
  });

  it("says whether the current lesson's required tasks are done", async () => {
    routes({
      [learningPath]: [
        json(
          200,
          learnerCourse({
            entry: {
              customerEntryPolicy: "open",
              membershipStatus: "active",
              enrollmentStatus: "active"
            },
            progress: progress()
          })
        )
      ]
    });
    renderEntry("intro");
    expect(
      await screen.findByText("Обязательные задания этого урока выполнены.")
    ).toBeInTheDocument();
    expect(screen.queryByText("Навыки курса")).not.toBeInTheDocument();
    expect(api.mock.calls.map(([path]) => path)).toEqual([learningPath]);
  });

  it("offers a retry after a failed load and refreshes when progress changes", async () => {
    const enrolled = learnerCourse({
      entry: {
        customerEntryPolicy: "open",
        membershipStatus: "active",
        enrollmentStatus: "active"
      },
      progress: progress()
    });
    routes({
      [learningPath]: [
        json(500),
        json(200, enrolled),
        json(200, {
          ...enrolled,
          progress: progress({
            allRequiredPassed: true,
            percentage: 100,
            passedRequired: 4
          })
        })
      ],
      [skillsPath]: [
        json(200, { skills: [itemAt(courseSkills().skills, 2)] }),
        json(200, {
          skills: [{ ...itemAt(courseSkills().skills, 0), position: 2 }]
        })
      ]
    });
    renderEntry();

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Не удалось загрузить состояние обучения."
    );
    await userEvent.click(
      screen.getByRole("button", { name: "Обновить состояние" })
    );
    expect(
      await screen.findByRole("link", { name: "Продолжить обучение" })
    ).toBeInTheDocument();

    act(() => {
      window.dispatchEvent(new Event("learning-progress-changed"));
    });
    expect(
      await screen.findByRole("link", { name: "Вернуться к материалам" })
    ).toBeInTheDocument();
    // The skills block reloads with the course state after new practice.
    expect(await screen.findByText("Освоено на 85 %")).toBeInTheDocument();
    expect(screen.queryByText("Ещё не проверяли")).not.toBeInTheDocument();
  });
});

describe("CourseProgress", () => {
  it("labels the bar with passed and total required tasks", () => {
    render(
      <CourseProgress learning={learnerCourse({ progress: progress() })} />
    );
    expect(
      screen.getByRole("progressbar", { name: "Задания курса: 1 из 4" })
    ).toHaveAttribute("value", "25");
  });

  it("explains a course without required tasks", () => {
    render(
      <CourseProgress
        learning={learnerCourse({
          progress: progress({
            percentage: null,
            totalRequired: 0,
            passedRequired: 0
          })
        })}
      />
    );
    expect(screen.getByText(/нет обязательных заданий/)).toBeInTheDocument();
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
  });

  it("shows completion separately from passed tasks", () => {
    render(
      <CourseProgress
        learning={learnerCourse({
          entry: {
            customerEntryPolicy: "open",
            membershipStatus: "active",
            enrollmentStatus: "completed"
          },
          progress: progress({
            allRequiredPassed: true,
            percentage: 100,
            passedRequired: 4
          })
        })}
      />
    );
    expect(
      screen.getByText("Все обязательные задания курса выполнены.")
    ).toBeInTheDocument();
    expect(screen.getByText("Обучение завершено.")).toBeInTheDocument();
  });

  describe("opening a lesson starts the site's own course", () => {
    const home = HOME_ORGANIZATION_SLUG;
    const homeLearning = `/v1/me/learning/${home}/web`;
    const homeJoin = `/v1/public/organizations/${home}/memberships/me`;
    const started = learnerCourse({
      organization: { slug: home, name: "Dorkin Academy" },
      entry: {
        customerEntryPolicy: "open",
        membershipStatus: "active",
        enrollmentStatus: "active"
      },
      progress: progress()
    });
    const fresh = learnerCourse({
      organization: { slug: home, name: "Dorkin Academy" }
    });
    const renderHome = (lessonSlug?: string) =>
      render(
        <LearnerEntry
          organizationSlug={home}
          offeringSlug="web"
          courseSlug="html"
          {...(lessonSlug ? { lessonSlug } : {})}
        />
      );

    it("joins and enrolls once, without a click, and tells the page", async () => {
      routes({
        [homeLearning]: [json(200, fresh), json(200, started)],
        [homeJoin]: [json(200)],
        [`${homeLearning}/enrollment`]: [json(201, started)]
      });
      const changed = vi.fn();
      window.addEventListener("learning-progress-changed", changed);
      renderHome("tags");
      expect(
        await screen.findByText("Курс начат: он появился в «Моём обучении».")
      ).toBeInTheDocument();
      expect(changed).toHaveBeenCalled();
      window.removeEventListener("learning-progress-changed", changed);
      const calls = api.mock.calls.map(([path]) => path);
      expect(calls.filter((p) => p === homeJoin)).toHaveLength(1);
      expect(calls.filter((p) => p.endsWith("/enrollment"))).toHaveLength(1);
    });

    it("waits for the button on the course page", async () => {
      routes({ [homeLearning]: [json(200, fresh)] });
      renderHome();
      expect(
        await screen.findByRole("button", { name: "Начать курс" })
      ).toBeInTheDocument();
      expect(api).toHaveBeenCalledTimes(1);
    });
  });
});
