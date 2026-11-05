import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { browserApiRequest } from "../../lib/public-api";
import { HOME_ORGANIZATION_SLUG } from "../../lib/public-learning-routes";
import { FeedbackDialog, feedbackOrganizationSlug } from "./feedback-dialog";

vi.mock("next/navigation", () => ({
  usePathname: () => "/courses/html/tags"
}));
vi.mock("../../lib/public-api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../lib/public-api")>()),
  browserApiRequest: vi.fn()
}));
const api = vi.mocked(browserApiRequest);

beforeAll(() => {
  // jsdom has no modal dialog; the primitive only needs open/close.
  HTMLDialogElement.prototype.showModal ??= function (this: HTMLDialogElement) {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close ??= function (this: HTMLDialogElement) {
    this.removeAttribute("open");
  };
});
beforeEach(() => api.mockReset());

function sentBody() {
  return JSON.parse(api.mock.calls[0]?.[1]?.body as string) as Record<
    string,
    unknown
  >;
}

describe("FeedbackDialog", () => {
  it("sends a problem with the page path and the home organization", async () => {
    api.mockResolvedValue(
      new Response(JSON.stringify({ id: "x" }), { status: 201 })
    );
    render(<FeedbackDialog open onClose={vi.fn()} />);
    await userEvent.type(
      screen.getByLabelText("Что случилось?"),
      "Кнопка проверки не реагирует"
    );
    await userEvent.type(
      screen.getByLabelText("Что вы ожидали? (необязательно)"),
      "Увидеть результат"
    );
    await userEvent.click(screen.getByRole("button", { name: "Отправить" }));

    await screen.findByText("Спасибо, сообщение отправлено");
    expect(api).toHaveBeenCalledWith(
      "/v1/feedback",
      expect.objectContaining({ method: "POST" })
    );
    expect(sentBody()).toMatchObject({
      organizationSlug: HOME_ORGANIZATION_SLUG,
      kind: "problem",
      text: "Кнопка проверки не реагирует",
      expected: "Увидеть результат",
      path: "/courses/html/tags"
    });
    expect(sentBody()).not.toHaveProperty("actual");
  });

  it("sends an idea without the problem fields", async () => {
    api.mockResolvedValue(new Response("{}", { status: 201 }));
    render(<FeedbackDialog open onClose={vi.fn()} />);
    await userEvent.click(screen.getByLabelText("Идея или пожелание"));
    expect(
      screen.queryByLabelText("Что вы ожидали? (необязательно)")
    ).not.toBeInTheDocument();
    await userEvent.type(
      screen.getByLabelText("Расскажите идею"),
      "Добавьте тёмную тему для кода"
    );
    await userEvent.click(screen.getByRole("button", { name: "Отправить" }));
    await waitFor(() => expect(api).toHaveBeenCalled());
    expect(sentBody()).toMatchObject({ kind: "idea" });
    expect(sentBody()).not.toHaveProperty("expected");
  });

  it("does not send a too short text", async () => {
    render(<FeedbackDialog open onClose={vi.fn()} />);
    const text = screen.getByLabelText("Что случилось?");
    text.removeAttribute("minlength");
    text.removeAttribute("required");
    await userEvent.type(text, "сломано");
    await userEvent.click(screen.getByRole("button", { name: "Отправить" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "от 10 до 4000 символов"
    );
    expect(api).not.toHaveBeenCalled();
  });

  it("explains the rate limit", async () => {
    api.mockResolvedValue(new Response("{}", { status: 429 }));
    render(<FeedbackDialog open onClose={vi.fn()} />);
    await userEvent.type(
      screen.getByLabelText("Что случилось?"),
      "Страница урока не открывается"
    );
    await userEvent.click(screen.getByRole("button", { name: "Отправить" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Попробуйте через час"
    );
  });
});

describe("feedbackOrganizationSlug", () => {
  it("takes the organization from /learn pages, otherwise the home one", () => {
    expect(feedbackOrganizationSlug("/learn/acme/html-free/tags")).toBe("acme");
    expect(feedbackOrganizationSlug("/courses/html")).toBe(
      HOME_ORGANIZATION_SLUG
    );
    expect(feedbackOrganizationSlug("/")).toBe(HOME_ORGANIZATION_SLUG);
  });
});
