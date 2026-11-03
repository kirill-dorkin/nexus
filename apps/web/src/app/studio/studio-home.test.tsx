import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { StudioError, studioRequest } from "../../components/studio/studio-api";
import { StudioHome } from "./studio-home";

vi.mock("../../components/studio/studio-api", async (importOriginal) => ({
  ...(await importOriginal<
    typeof import("../../components/studio/studio-api")
  >()),
  studioRequest: vi.fn()
}));
const api = vi.mocked(studioRequest);

const acme = {
  id: "0195d9a8-6c8e-7000-8000-0000000000f1",
  slug: "acme",
  name: "Acme"
};
const beta = {
  id: "0195d9a8-6c8e-7000-8000-0000000000f2",
  slug: "beta",
  name: "Beta"
};
const course = (n: number, status: "draft" | "published") => ({
  courseId: `0195d9a8-6c8e-7000-8000-00000000010${n}`,
  slug: `course-${n}`,
  title: `Курс ${n}`,
  versionId: `0195d9a8-6c8e-7000-8000-00000000020${n}`,
  versionNumber: n,
  status,
  revision: 0
});

function routes(table: Record<string, unknown[]>) {
  api.mockImplementation((path) => {
    const next = table[path]?.shift();
    if (next === undefined)
      return Promise.reject(new Error(`Unexpected ${path}`));
    return next instanceof Error ? Promise.reject(next) : Promise.resolve(next);
  });
}
const coursesPath = `organizations/${acme.id}/studio/courses`;

beforeEach(() => {
  api.mockReset();
});

describe("StudioHome", () => {
  it("lists the organizations and their courses", async () => {
    routes({
      "me/organizations": [{ organizations: [acme], nextCursor: beta.id }],
      [`me/organizations?after=${beta.id}`]: [
        { organizations: [beta], nextCursor: null }
      ],
      [coursesPath]: [
        {
          courses: [course(1, "draft"), course(2, "published")],
          nextCursor: course(2, "published").courseId,
          canCreate: true
        }
      ],
      [`${coursesPath}?after=${course(2, "published").courseId}`]: [
        { courses: [course(3, "draft")], nextCursor: null, canCreate: true }
      ]
    });
    render(<StudioHome />);
    expect(await screen.findByText("Выберите организацию")).toBeInTheDocument();

    await userEvent.click(
      screen.getByRole("button", { name: "Ещё организации" })
    );
    expect(
      await screen.findByRole("button", { name: /^Beta/ })
    ).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /^Acme/ }));
    const workspace = within(
      screen.getByRole("region", { name: "Курсы организации" })
    );
    expect(
      await workspace.findByRole("link", { name: /Курс 1/ })
    ).toHaveAttribute(
      "href",
      `/studio/${acme.id}/${course(1, "draft").courseId}`
    );
    expect(
      workspace.getByRole("link", { name: "Создать курс" })
    ).toHaveAttribute("href", `/studio/${acme.id}/new`);
    expect(
      workspace.getAllByRole("link", { name: "Доступ и ссылка" })
    ).toHaveLength(1);

    await userEvent.click(workspace.getByRole("button", { name: "Ещё курсы" }));
    expect(
      await workspace.findByRole("link", { name: /Курс 3/ })
    ).toBeInTheDocument();
    expect(
      workspace.queryByRole("button", { name: "Ещё курсы" })
    ).not.toBeInTheDocument();
  });

  it("explains an organization without courses for a non-author", async () => {
    routes({
      "me/organizations": [{ organizations: [acme], nextCursor: null }],
      [coursesPath]: [{ courses: [], nextCursor: null, canCreate: false }]
    });
    render(<StudioHome />);
    await userEvent.click(await screen.findByRole("button", { name: /^Acme/ }));
    expect(
      await screen.findByText("Пока нет доступных курсов")
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "Создать курс" })
    ).not.toBeInTheDocument();
  });

  it("offers a retry when the courses cannot be loaded", async () => {
    routes({
      "me/organizations": [{ organizations: [acme], nextCursor: null }],
      [coursesPath]: [
        new StudioError(500, "Сбой"),
        { courses: [course(1, "draft")], nextCursor: null, canCreate: false }
      ]
    });
    render(<StudioHome />);
    await userEvent.click(await screen.findByRole("button", { name: /^Acme/ }));
    await userEvent.click(
      await screen.findByRole("button", { name: "Повторить загрузку курсов" })
    );
    expect(
      await screen.findByRole("link", { name: /Курс 1/ })
    ).toBeInTheDocument();
  });

  it("asks to sign in, or says Studio is unavailable", async () => {
    routes({
      "me/organizations": [new StudioError(401, "Войдите в аккаунт.")]
    });
    const { unmount } = render(<StudioHome />);
    expect(
      await screen.findByRole("link", { name: "Войти в Studio" })
    ).toBeInTheDocument();
    unmount();

    routes({ "me/organizations": [new StudioError(503, "Недоступно")] });
    render(<StudioHome />);
    expect(
      await screen.findByText("Studio пока недоступна")
    ).toBeInTheDocument();
  });
});
