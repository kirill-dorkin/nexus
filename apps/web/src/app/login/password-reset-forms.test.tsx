import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { browserApiRequest } from "../../lib/public-api";
import { ForgotPasswordLink } from "./forgot-password-link";
import {
  PasswordResetConfirmForm,
  PasswordResetRequestForm,
  forgetLinkToken
} from "./password-reset-forms";

vi.mock("../../lib/public-api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../lib/public-api")>()),
  browserApiRequest: vi.fn()
}));
const api = vi.mocked(browserApiRequest);
const token = "A".repeat(43);
const assign = vi.fn();

beforeEach(() => {
  api.mockReset();
  assign.mockReset();
  vi.spyOn(window.location, "assign").mockImplementation(assign);
});
afterEach(() => {
  window.history.replaceState(null, "", "/");
  forgetLinkToken();
});

describe("password reset request", () => {
  it("shows the same confirmation after a 202", async () => {
    api.mockResolvedValue(new Response(null, { status: 202 }));
    render(<PasswordResetRequestForm />);
    await userEvent.type(
      screen.getByLabelText("Электронная почта"),
      " learner@example.test "
    );
    await userEvent.click(
      screen.getByRole("button", { name: "Прислать ссылку" })
    );
    expect(await screen.findByText("Проверьте почту")).toBeInTheDocument();
    expect(api).toHaveBeenCalledWith("/v1/auth/password-reset/request", {
      method: "POST",
      body: JSON.stringify({ email: "learner@example.test" })
    });
  });

  it("explains the rate limit", async () => {
    api.mockResolvedValue(new Response(null, { status: 429 }));
    render(<PasswordResetRequestForm />);
    await userEvent.type(
      screen.getByLabelText("Электронная почта"),
      "learner@example.test"
    );
    await userEvent.click(
      screen.getByRole("button", { name: "Прислать ссылку" })
    );
    expect(await screen.findByRole("alert")).toHaveTextContent("через час");
  });
});

describe("password reset confirm", () => {
  it("takes the token from the fragment, hides it and signs in", async () => {
    window.history.replaceState(null, "", `/reset-password#token=${token}`);
    api.mockResolvedValue(new Response("{}", { status: 200 }));
    render(<PasswordResetConfirmForm />);
    await waitFor(() => expect(window.location.hash).toBe(""));
    await userEvent.type(
      screen.getByLabelText("Новый пароль", { selector: "input" }),
      "a brand new long password"
    );
    await userEvent.click(
      screen.getByRole("button", { name: "Сохранить и войти" })
    );
    await waitFor(() => expect(assign).toHaveBeenCalledWith("/me/learning"));
    expect(JSON.parse(api.mock.calls[0]?.[1]?.body as string)).toEqual({
      token,
      password: "a brand new long password"
    });
  });

  it("asks for a new link when the token is missing or refused", async () => {
    window.history.replaceState(null, "", "/reset-password");
    render(<PasswordResetConfirmForm />);
    expect(
      await screen.findByText("Ссылка недействительна или устарела")
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Запросите новую" })
    ).toHaveAttribute("href", "/forgot-password");
  });
});

describe("forgot password link", () => {
  it("appears only when reset is available", async () => {
    api.mockResolvedValueOnce(
      new Response(JSON.stringify({ available: true }), { status: 200 })
    );
    const { unmount } = render(<ForgotPasswordLink />);
    expect(
      await screen.findByRole("link", { name: "Забыли пароль?" })
    ).toHaveAttribute("href", "/forgot-password");
    unmount();

    api.mockResolvedValueOnce(
      new Response(JSON.stringify({ available: false }), { status: 200 })
    );
    render(<ForgotPasswordLink />);
    await waitFor(() => expect(api).toHaveBeenCalledTimes(2));
    expect(
      screen.queryByRole("link", { name: "Забыли пароль?" })
    ).not.toBeInTheDocument();
  });
});
