import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { currentRegistrationConsents } from "@platform/contracts";

import { browserApiRequest } from "../../lib/public-api";
import { LearningAuth } from "./learning-auth";

vi.mock("../../lib/public-api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../lib/public-api")>()),
  browserApiRequest: vi.fn()
}));
const api = vi.mocked(browserApiRequest);

function json(status: number, body: unknown = {}) {
  return new Response(JSON.stringify(body), { status });
}
const user = {
  id: "0195d9a8-6c8e-7000-8000-000000000001",
  email: "learner@example.com",
  displayName: null,
  status: "active"
};
const password = "correct horse battery";
const assign = vi.fn();

/** Answers provider discovery, then the given responses for the form. */
function respond(providers: string[] | null, ...form: (Response | Error)[]) {
  api.mockImplementation((path) => {
    if (path === "/v1/auth/oauth/providers") {
      return Promise.resolve(providers ? json(200, { providers }) : json(503));
    }
    const next = form.shift();
    if (!next) throw new Error(`Unexpected request ${path}`);
    return next instanceof Error ? Promise.reject(next) : Promise.resolve(next);
  });
}
async function fillAndSubmit(button: string) {
  await userEvent.type(screen.getByLabelText("Электронная почта"), user.email);
  await userEvent.type(screen.getByLabelText("Пароль"), password);
  for (const consent of screen.queryAllByRole("checkbox")) {
    await userEvent.click(consent);
  }
  await userEvent.click(screen.getByRole("button", { name: button }));
}
function sentBody() {
  const call = api.mock.calls.find(
    ([path]) => path.startsWith("/v1/auth/") && !path.includes("oauth")
  );
  return JSON.parse(call?.[1]?.body as string) as Record<string, unknown>;
}

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_API_ORIGIN", "https://api.example.test");
  vi.spyOn(window.location, "assign").mockImplementation(assign);
  api.mockReset();
  assign.mockReset();
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("LearningAuth", () => {
  it("signs in and returns to the lesson the learner came from", async () => {
    respond(null, json(200, user));
    render(<LearningAuth returnTo="/courses/html/tags" />);
    await fillAndSubmit("Войти");

    await waitFor(() => {
      expect(assign).toHaveBeenCalledWith("/courses/html/tags");
    });
    expect(api).toHaveBeenCalledWith(
      "/v1/auth/login",
      expect.objectContaining({ method: "POST" })
    );
    expect(sentBody()).toEqual({ email: user.email, password });
  });

  it("never returns to a foreign address", async () => {
    respond(null, json(200, user));
    render(<LearningAuth returnTo="https://evil.example/steal" />);
    await fillAndSubmit("Войти");
    await waitFor(() => {
      expect(assign).toHaveBeenCalledWith("/me/learning");
    });
  });

  it("explains wrong credentials and keeps the learner on the form", async () => {
    respond(null, json(401));
    render(<LearningAuth returnTo="/me/learning" />);
    await fillAndSubmit("Войти");
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Проверьте почту и пароль."
    );
    expect(assign).not.toHaveBeenCalled();
  });

  it("reports an unreachable server", async () => {
    respond(null, new TypeError("offline"));
    render(<LearningAuth returnTo="/me/learning" />);
    await fillAndSubmit("Войти");
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Не удалось связаться с сервером."
    );
  });

  it("registers with an optional name and describes the fields", async () => {
    respond(null, json(201, user));
    render(<LearningAuth returnTo="/me/learning" initialMode="register" />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "Начнём обучение."
    );
    expect(screen.getByLabelText("Имя")).toHaveAccessibleDescription(
      "Необязательно"
    );
    expect(screen.getByLabelText("Пароль")).toHaveAccessibleDescription(
      "Не менее 15 символов."
    );

    await userEvent.type(screen.getByLabelText("Имя"), "  Ника  ");
    await fillAndSubmit("Создать аккаунт");
    await waitFor(() => {
      expect(assign).toHaveBeenCalled();
    });
    expect(api).toHaveBeenCalledWith("/v1/auth/register", expect.anything());
    expect(sentBody()).toEqual({
      email: user.email,
      password,
      displayName: "Ника",
      consents: currentRegistrationConsents()
    });
  });

  it("requires both legal consents before creating an account", async () => {
    respond(null, json(201, user));
    render(<LearningAuth returnTo="/me/learning" initialMode="register" />);
    const terms = screen.getByRole("checkbox", {
      name: /условия использования/
    });
    const personalData = screen.getByRole("checkbox", {
      name: /обработку персональных данных/
    });
    expect(terms).toBeRequired();
    expect(personalData).toBeRequired();
    expect(
      screen.getByRole("link", { name: "условия использования" })
    ).toHaveAttribute("href", "/terms");
    expect(
      screen.getByRole("link", { name: "политикой конфиденциальности" })
    ).toHaveAttribute("href", "/privacy");
  });

  it("asks to reload when the legal documents changed", async () => {
    respond(
      null,
      json(409, { code: "legal_consent_required", documents: ["terms"] })
    );
    render(<LearningAuth returnTo="/me/learning" initialMode="register" />);
    await fillAndSubmit("Создать аккаунт");

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Документы обновились"
    );
  });

  it("does not show consent checkboxes for sign-in", () => {
    respond(null);
    render(<LearningAuth returnTo="/me/learning" />);
    expect(screen.queryAllByRole("checkbox")).toHaveLength(0);
  });

  it("leaves out a blank name and explains an existing account", async () => {
    respond(null, json(409));
    render(<LearningAuth returnTo="/me/learning" initialMode="register" />);
    await userEvent.type(screen.getByLabelText("Имя"), "   ");
    await fillAndSubmit("Создать аккаунт");

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Аккаунт с такой почтой уже существует."
    );
    expect(sentBody()).not.toHaveProperty("displayName");
  });

  it("switches between sign-in and registration and clears the old error", async () => {
    respond(null);
    render(<LearningAuth returnTo="/me/learning" externalLoginFailed />);
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Не удалось завершить вход"
    );

    await userEvent.click(screen.getByRole("button", { name: "Регистрация" }));
    expect(screen.getByRole("button", { name: "Регистрация" })).toHaveAttribute(
      "aria-pressed",
      "true"
    );
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Пароль")).toHaveAttribute(
      "autocomplete",
      "new-password"
    );
  });

  it("offers external sign-in only for providers the API reports", async () => {
    respond(["github"]);
    render(<LearningAuth returnTo="/courses/sql" />);

    const github = await screen.findByRole("link", {
      name: "Войти через GitHub"
    });
    expect(github).toHaveAttribute(
      "href",
      "https://api.example.test/v1/auth/oauth/github/start?returnTo=%2Fcourses%2Fsql"
    );
    expect(
      screen.queryByRole("link", { name: /Google/ })
    ).not.toBeInTheDocument();
  });

  it("keeps password sign-in when provider discovery fails", async () => {
    respond(null);
    render(<LearningAuth returnTo="/me/learning" />);
    await waitFor(() => {
      expect(api).toHaveBeenCalledWith(
        "/v1/auth/oauth/providers",
        expect.anything()
      );
    });
    expect(
      screen.queryByRole("link", { name: /через/ })
    ).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Войти" })).toBeEnabled();
  });
});
