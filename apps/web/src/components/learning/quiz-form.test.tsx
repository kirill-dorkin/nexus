import type { PublicQuizActivity } from "@platform/contracts";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { browserApiRequest } from "../../lib/public-api";
import { QuizForm } from "./quiz-form";

vi.mock("../../lib/public-api", () => ({
  browserApiRequest: vi.fn()
}));
const api = vi.mocked(browserApiRequest);

const single: PublicQuizActivity = {
  slug: "what-is-html",
  title: "Что такое HTML",
  instructions: "",
  question: "HTML — это…",
  type: "quiz.single_choice",
  options: [
    { id: "markup", text: "Язык разметки" },
    { id: "style", text: "Язык стилей" }
  ]
};

function json(status: number, body: unknown = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" }
  });
}
const passed = {
  attemptNumber: 1,
  outcome: "passed",
  score: 1,
  feedback: "Да, это разметка."
};
const failed = {
  attemptNumber: 2,
  outcome: "failed",
  score: 0,
  feedback: "Подумайте ещё."
};

function renderQuiz(activity: PublicQuizActivity = single) {
  return render(
    <QuizForm
      activity={activity}
      organizationSlug="acme"
      offeringSlug="web"
      courseSlug="html"
      lessonSlug="lesson-1"
    />
  );
}
const checkPath = "/v1/me/learning/acme/web/quiz/what-is-html/check";
const submitButton = () =>
  screen.getByRole("button", {
    name: /Проверить и сохранить ответ|Повторить отправку ответа/
  });
function sentBody(call: number) {
  const init = api.mock.calls[call]?.[1];
  return JSON.parse(init?.body as string) as {
    attemptKey: string;
    answer: unknown;
  };
}

beforeEach(() => {
  api.mockReset();
});

describe("QuizForm", () => {
  it("cannot be submitted before an answer is chosen", () => {
    renderQuiz();
    expect(submitButton()).toBeDisabled();
  });

  it("saves the chosen answer, shows the result and locks the choices", async () => {
    api.mockResolvedValueOnce(json(200, passed));
    const progress = vi.fn();
    window.addEventListener("learning-progress-changed", progress);
    renderQuiz();

    await userEvent.click(screen.getByRole("radio", { name: "Язык разметки" }));
    await userEvent.click(submitButton());

    expect(await screen.findByText("Правильно")).toBeInTheDocument();
    expect(screen.getByText("Да, это разметка.")).toBeInTheDocument();
    expect(
      screen.getByText("Попытка 1. Результат сохранён.")
    ).toBeInTheDocument();
    expect(api).toHaveBeenCalledWith(
      checkPath,
      expect.objectContaining({ method: "POST" })
    );
    expect(sentBody(0).answer).toEqual({
      type: "quiz.single_choice",
      optionId: "markup"
    });
    expect(screen.getByRole("radio", { name: "Язык стилей" })).toBeDisabled();
    expect(progress).toHaveBeenCalled();
    window.removeEventListener("learning-progress-changed", progress);
  });

  it("starts a new attempt with a fresh answer after «Попробовать ещё раз»", async () => {
    api
      .mockResolvedValueOnce(json(200, failed))
      .mockResolvedValueOnce(json(200, passed));
    renderQuiz();

    await userEvent.click(screen.getByRole("radio", { name: "Язык стилей" }));
    await userEvent.click(submitButton());
    expect(await screen.findByText("Ответ пока неверный")).toBeInTheDocument();

    await userEvent.click(
      screen.getByRole("button", { name: "Попробовать ещё раз" })
    );
    expect(
      screen.getByRole("radio", { name: "Язык стилей" })
    ).not.toBeChecked();
    expect(submitButton()).toBeDisabled();

    await userEvent.click(screen.getByRole("radio", { name: "Язык разметки" }));
    await userEvent.click(submitButton());
    expect(await screen.findByText("Правильно")).toBeInTheDocument();
    expect(sentBody(1).attemptKey).not.toBe(sentBody(0).attemptKey);
  });

  it("asks to wait when checks come too fast and keeps the same attempt", async () => {
    api
      .mockResolvedValueOnce(json(429))
      .mockResolvedValueOnce(json(200, passed));
    renderQuiz();

    await userEvent.click(screen.getByRole("radio", { name: "Язык разметки" }));
    await userEvent.click(submitButton());
    expect(
      await screen.findByText(/Слишком много проверок подряд/)
    ).toBeInTheDocument();

    await userEvent.click(
      screen.getByRole("button", { name: "Повторить отправку ответа" })
    );
    expect(await screen.findByText("Правильно")).toBeInTheDocument();
    expect(sentBody(1)).toEqual(sentBody(0));
  });

  it("resends the same attempt after a failed check, so the server can deduplicate it", async () => {
    api
      .mockResolvedValueOnce(json(500))
      .mockResolvedValueOnce(json(200, passed));
    renderQuiz();

    await userEvent.click(screen.getByRole("radio", { name: "Язык разметки" }));
    await userEvent.click(submitButton());
    expect(
      await screen.findByText(
        "Проверка не завершилась. Повторите отправку этого же ответа."
      )
    ).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Язык стилей" })).toBeDisabled();

    await userEvent.click(
      screen.getByRole("button", { name: "Повторить отправку ответа" })
    );
    expect(await screen.findByText("Правильно")).toBeInTheDocument();
    expect(sentBody(1)).toEqual(sentBody(0));
  });

  it("treats a network failure like a failed check", async () => {
    api.mockRejectedValueOnce(new TypeError("offline"));
    renderQuiz();
    await userEvent.click(screen.getByRole("radio", { name: "Язык разметки" }));
    await userEvent.click(submitButton());
    expect(
      await screen.findByText(
        "Не удалось получить результат. Повторите отправку этого же ответа."
      )
    ).toBeInTheDocument();
  });

  it("drops a rejected answer so the learner can choose again", async () => {
    api.mockResolvedValueOnce(json(400));
    renderQuiz();
    await userEvent.click(screen.getByRole("radio", { name: "Язык разметки" }));
    await userEvent.click(submitButton());

    expect(
      await screen.findByText(
        "Проверьте формат ответа и выберите вариант из этого задания."
      )
    ).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Язык стилей" })).toBeEnabled();
  });

  it("asks an anonymous learner to sign in and come back to this lesson", async () => {
    api.mockResolvedValueOnce(json(401));
    renderQuiz();
    await userEvent.click(screen.getByRole("radio", { name: "Язык разметки" }));
    await userEvent.click(submitButton());

    const returnTo = encodeURIComponent("/learn/acme/web/lesson-1");
    expect(await screen.findByRole("link", { name: "Войти" })).toHaveAttribute(
      "href",
      `/login?returnTo=${returnTo}`
    );
    expect(
      screen.getByRole("link", { name: "Создать аккаунт" })
    ).toHaveAttribute("href", `/login?returnTo=${returnTo}&mode=register`);
  });

  it("enrolls a signed-in learner in the free course and checks again", async () => {
    api
      .mockResolvedValueOnce(json(403))
      .mockResolvedValueOnce(json(200))
      .mockResolvedValueOnce(json(201))
      .mockResolvedValueOnce(json(200, passed));
    renderQuiz();
    await userEvent.click(screen.getByRole("radio", { name: "Язык разметки" }));
    await userEvent.click(submitButton());

    expect(await screen.findByText("Правильно")).toBeInTheDocument();
    expect(api.mock.calls.map(([path]) => path)).toEqual([
      checkPath,
      "/v1/public/organizations/acme/memberships/me",
      "/v1/me/learning/acme/web/enrollment",
      checkPath
    ]);
  });

  it("explains a course closed to self-enrollment", async () => {
    api.mockResolvedValueOnce(json(403)).mockResolvedValueOnce(json(403));
    renderQuiz();
    await userEvent.click(screen.getByRole("radio", { name: "Язык разметки" }));
    await userEvent.click(submitButton());
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Этот курс сейчас закрыт для самостоятельной записи."
    );
  });

  it("collects every checked option of a multiple-choice question", async () => {
    api.mockResolvedValueOnce(json(200, passed));
    renderQuiz({ ...single, type: "quiz.multiple_choice" });
    await userEvent.click(
      screen.getByRole("checkbox", { name: "Язык разметки" })
    );
    await userEvent.click(
      screen.getByRole("checkbox", { name: "Язык стилей" })
    );
    await userEvent.click(
      screen.getByRole("checkbox", { name: "Язык стилей" })
    );
    await userEvent.click(submitButton());

    await waitFor(() => {
      expect(api).toHaveBeenCalled();
    });
    expect(sentBody(0).answer).toEqual({
      type: "quiz.multiple_choice",
      optionIds: ["markup"]
    });
  });

  it("ignores a blank short answer and sends the typed one", async () => {
    api.mockResolvedValueOnce(json(200, passed));
    const { slug, title, instructions, question } = single;
    renderQuiz({
      slug,
      title,
      instructions,
      question,
      type: "quiz.short_text"
    });

    const input = screen.getByLabelText("Ваш ответ");
    await userEvent.type(input, "   ");
    expect(submitButton()).toBeDisabled();

    await userEvent.type(input, "разметка");
    await userEvent.click(submitButton());
    await waitFor(() => {
      expect(api).toHaveBeenCalled();
    });
    expect(sentBody(0).answer).toEqual({
      type: "quiz.short_text",
      text: "   разметка"
    });
  });
});
