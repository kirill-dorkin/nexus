import type { LearningOffering } from "@platform/contracts";
import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { browserApiRequest } from "../../lib/public-api";
import { json, studioDraft } from "../../test/fixtures";
import { OfferingManager } from "./offering-manager";
import { StudioError, studioRequest } from "./studio-api";

vi.mock("../../lib/public-api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../lib/public-api")>()),
  browserApiRequest: vi.fn()
}));
vi.mock("./studio-api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./studio-api")>()),
  studioRequest: vi.fn()
}));
const api = vi.mocked(studioRequest);
const patch = vi.mocked(browserApiRequest);

const org = "0195d9a8-6c8e-7000-8000-0000000000f1";
const published = studioDraft({ status: "published" });
const coursePath = `organizations/${org}/studio/courses/${published.courseId}`;
const offeringsPath = `organizations/${org}/offerings`;
const listPath = `${offeringsPath}?courseVersionId=${published.versionId}`;
const organizations = {
  organizations: [{ id: org, slug: "acme", name: "Acme" }],
  nextCursor: null
};
// The API cursor is the id of the last offering on the page.
const cursor = "0195d9a8-6c8e-7000-8000-0000000000d1";
function offering(overrides: Partial<LearningOffering> = {}): LearningOffering {
  return {
    id: "0195d9a8-6c8e-7000-8000-0000000000d1",
    organizationId: org,
    courseVersionId: published.versionId,
    slug: "html-free",
    name: "HTML бесплатно",
    deliveryMode: "self_paced",
    accessMode: "membership",
    status: "open",
    visibility: "private",
    startsAt: null,
    endsAt: null,
    ...overrides
  };
}

function routes(table: Record<string, unknown[]>) {
  api.mockImplementation((path) => {
    const next = table[path]?.shift();
    if (next === undefined)
      return Promise.reject(new Error(`Unexpected ${path}`));
    return next instanceof Error ? Promise.reject(next) : Promise.resolve(next);
  });
}
function standard(
  list: LearningOffering[],
  extra: Record<string, unknown[]> = {}
) {
  routes({
    [coursePath]: [published, published],
    "me/organizations": [organizations, organizations],
    [listPath]: [
      { offerings: list, nextCursor: null },
      { offerings: list, nextCursor: null }
    ],
    ...extra
  });
}
function renderManager() {
  render(
    <OfferingManager organizationId={org} courseId={published.courseId} />
  );
}
const card = (name: string) =>
  within(screen.getByRole("heading", { level: 3, name }).closest("article")!);

beforeEach(() => {
  api.mockReset();
  patch.mockReset();
});

describe("OfferingManager", () => {
  it("asks to publish a draft before managing access", async () => {
    routes({
      [coursePath]: [studioDraft()],
      "me/organizations": [organizations]
    });
    renderManager();
    expect(
      await screen.findByText(/Эта версия ещё не опубликована/)
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "Новый доступ" })
    ).not.toBeInTheDocument();
  });

  it("lists the offerings of the published version", async () => {
    standard([
      offering(),
      offering({
        id: "0195d9a8-6c8e-7000-8000-0000000000d2",
        slug: "html-paid",
        name: "Платный",
        accessMode: "entitlement_required",
        status: "closed"
      })
    ]);
    renderManager();
    await screen.findByRole("heading", { level: 3, name: "HTML бесплатно" });
    expect(
      card("HTML бесплатно").getByText("Приватный · Открыт")
    ).toBeInTheDocument();
    expect(
      card("Платный").getByText(/не относится к бесплатному/)
    ).toBeInTheDocument();
    expect(
      card("Платный").getByRole("button", { name: "Открыть публичный доступ" })
    ).toBeDisabled();
  });

  it("opens public access only after an explicit confirmation", async () => {
    standard([offering()]);
    patch.mockResolvedValueOnce(json(200, offering({ visibility: "public" })));
    renderManager();
    await userEvent.click(
      await screen.findByRole("button", { name: "Открыть публичный доступ" })
    );
    expect(patch).not.toHaveBeenCalled();
    expect(screen.getByText(/станет доступен без входа/)).toBeInTheDocument();

    await userEvent.click(
      screen.getByRole("button", { name: "Подтвердить открытие доступа" })
    );
    expect(
      await screen.findByText("Публичный доступ включён.")
    ).toBeInTheDocument();
    expect(patch).toHaveBeenCalledWith(
      `/v1/${offeringsPath}/${offering().id}/visibility`,
      { method: "PATCH", body: JSON.stringify({ visibility: "public" }) }
    );
    const link = card("HTML бесплатно").getByRole("link");
    expect(link).toHaveAttribute(
      "href",
      `${window.location.origin}/learn/acme/html-free`
    );
  });

  it("copies the public link", async () => {
    standard([offering({ visibility: "public" })]);
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      configurable: true
    });
    renderManager();
    await userEvent.click(
      await screen.findByRole("button", { name: "Скопировать ссылку" })
    );
    expect(writeText).toHaveBeenCalledWith(
      `${window.location.origin}/learn/acme/html-free`
    );
    expect(screen.getByText("Ссылка скопирована.")).toBeInTheDocument();
  });

  it("locks further changes after an unconfirmed result until the list is reloaded", async () => {
    standard([offering({ visibility: "public" })]);
    patch.mockResolvedValueOnce(json(500));
    renderManager();
    await userEvent.click(
      await screen.findByRole("button", { name: "Скрыть публичный доступ" })
    );

    expect(
      await screen.findByText(/Результат предыдущего изменения не подтверждён/)
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Создать приватный доступ" })
    ).toBeDisabled();
    await userEvent.click(
      screen.getByRole("button", { name: "Обновить доступы" })
    );
    expect(
      await screen.findByText("Загружены актуальные настройки доступа.")
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Создать приватный доступ" })
    ).toBeEnabled();
  });

  it("creates a private offering and refuses an invalid or taken address", async () => {
    const created = offering({
      id: "0195d9a8-6c8e-7000-8000-0000000000d3",
      slug: "html-2026",
      name: "Поток 2026"
    });
    standard([offering()], {
      [offeringsPath]: [created],
      [listPath]: [
        { offerings: [offering()], nextCursor: null },
        { offerings: [offering(), created], nextCursor: null }
      ]
    });
    renderManager();
    const slug = await screen.findByLabelText("Адрес курса (slug)");
    expect(slug).toHaveValue("html");

    fireEvent.change(slug, { target: { value: "html-free" } });
    fireEvent.submit(slug.closest("form")!);
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Offering с таким адресом уже есть."
    );

    fireEvent.change(slug, { target: { value: "Не Slug" } });
    fireEvent.submit(slug.closest("form")!);
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Проверьте название и адрес"
    );

    fireEvent.change(screen.getByLabelText("Название"), {
      target: { value: "Поток 2026" }
    });
    fireEvent.change(slug, { target: { value: "html-2026" } });
    fireEvent.submit(slug.closest("form")!);
    expect(
      await screen.findByText(/Доступ создан приватным/)
    ).toBeInTheDocument();
    expect(api).toHaveBeenCalledWith(offeringsPath, {
      courseVersionId: published.versionId,
      name: "Поток 2026",
      slug: "html-2026",
      deliveryMode: "self_paced",
      accessMode: "membership"
    });
    expect(
      screen.getByRole("heading", { level: 3, name: "Поток 2026" })
    ).toBeInTheDocument();
  });

  it("loads more offerings page by page", async () => {
    routes({
      [coursePath]: [published],
      "me/organizations": [organizations],
      [listPath]: [{ offerings: [offering()], nextCursor: cursor }],
      [`${listPath}&after=${cursor}`]: [
        {
          offerings: [
            offering({
              id: "0195d9a8-6c8e-7000-8000-0000000000d4",
              slug: "second",
              name: "Второй"
            })
          ],
          nextCursor: null
        }
      ]
    });
    renderManager();
    await userEvent.click(
      await screen.findByRole("button", { name: "Загрузить ещё" })
    );
    expect(
      await screen.findByRole("heading", { level: 3, name: "Второй" })
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Загрузить ещё" })
    ).not.toBeInTheDocument();
  });

  it("asks to sign in when the session is missing", async () => {
    routes({
      [coursePath]: [new StudioError(401, "Войдите в аккаунт.")],
      "me/organizations": [organizations]
    });
    renderManager();
    expect(
      await screen.findByRole("link", { name: "Войти в Studio" })
    ).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Войдите в Studio и попробуйте снова."
    );
  });
});
