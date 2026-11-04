import type { PublicAssignmentActivity } from "@platform/contracts";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { browserApiRequest } from "../../../lib/public-api";
import { AssignmentBlock } from "./assignment-block";

vi.mock("../../../lib/public-api", () => ({ browserApiRequest: vi.fn() }));
const api = vi.mocked(browserApiRequest);

const activity: PublicAssignmentActivity = {
  slug: "first-page",
  title: "Первая страница",
  instructions: "Сделайте заголовок.",
  question: null,
  type: "assignment.files",
  lang: "html",
  entry: "index.html",
  starterFiles: { "index.html": "<!doctype html>" },
  allowedFiles: ["index.html", "style.css"],
  checkLabels: ["Есть заголовок", "Заголовок красный"]
};

const json = (status: number, body: unknown = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" }
  });

function setup() {
  render(
    <AssignmentBlock
      activity={activity}
      organizationSlug="nexus"
      offeringSlug="html"
      courseSlug="html"
      lessonSlug="start"
    />
  );
}

const pick = (files: File[]) =>
  userEvent.upload(screen.getByLabelText(/Выберите zip-архив/), files);

beforeEach(() => {
  api.mockReset();
});

describe("AssignmentBlock", () => {
  it("lists what will be checked and sends nothing until files are chosen", () => {
    setup();
    expect(screen.getByText("Заголовок красный")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Отправить на проверку" })
    ).toBeDisabled();
  });

  it("explains files that cannot be checked", async () => {
    setup();
    await pick([
      new File(["h1{}"], "style.css"),
      new File(["<p>"], "extra.html")
    ]);
    expect(
      screen.getByRole("list", { name: "Замечания к файлам" })
    ).toHaveTextContent("Файл extra.html не нужен в этом задании.");
    expect(
      screen.getByText(/Нет главного файла index.html/)
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Отправить на проверку" })
    ).toBeDisabled();
  });

  it("sends the files and shows what to fix", async () => {
    api.mockResolvedValueOnce(
      json(200, {
        attemptNumber: 1,
        outcome: "failed",
        score: 0.5,
        checks: [
          { label: "Есть заголовок", passed: true },
          { label: "Заголовок красный", passed: false, hint: "Задайте цвет." }
        ]
      })
    );
    setup();
    await pick([new File(["<h1>Привет</h1>"], "index.html")]);
    await userEvent.click(
      screen.getByRole("button", { name: "Отправить на проверку" })
    );
    const report = await screen.findByRole("region", {
      name: "Результат проверки"
    });
    expect(report).toHaveTextContent("Пройдено проверок: 1 из 2");
    expect(report).toHaveTextContent("Задайте цвет.");
    const [url, init] = api.mock.calls[0]!;
    expect(url).toBe(
      "/v1/me/learning/nexus/html/assignments/first-page/submissions"
    );
    expect(JSON.parse(init?.body as string)).toMatchObject({
      files: { "index.html": "<h1>Привет</h1>" }
    });
  });

  it("asks an anonymous learner to sign in", async () => {
    api.mockResolvedValueOnce(json(401));
    setup();
    await pick([new File(["<h1>"], "index.html")]);
    await userEvent.click(
      screen.getByRole("button", { name: "Отправить на проверку" })
    );
    expect(
      await screen.findByText("Файлы готовы к проверке — осталось войти")
    ).toBeInTheDocument();
  });
});
