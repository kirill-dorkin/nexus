import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { browserApiRequest } from "../../lib/public-api";
import { ChallengeBlock, ChallengeFence, type Challenge } from "./challenge";

vi.mock("../../lib/public-api", () => ({
  browserApiRequest: vi.fn()
}));

const heading: Challenge = {
  title: "Первый заголовок",
  task: "Добавьте заголовок `h1` с текстом «Привет».",
  start: "<p>Текст</p>",
  checks: [
    { label: "Есть заголовок h1", selector: "h1" },
    { label: "В заголовке слово «Привет»", selector: "h1", text: "Привет" }
  ],
  hint: "Заголовок пишется тегом `<h1>`.",
  solution: "<h1>Привет</h1>\n<p>Текст</p>"
};

const editor = () => screen.getByRole("textbox", { name: /Код задания/ });
const check = (label: string) =>
  within(screen.getByRole("list")).getByText(label).closest("li");

beforeEach(() => {
  localStorage.clear();
  vi.mocked(browserApiRequest).mockResolvedValue(
    new Response(null, { status: 401 })
  );
});

describe("ChallengeBlock", () => {
  it("lists every check as not done yet and does not take focus on load", () => {
    render(<ChallengeBlock challenge={heading} />);
    expect(
      screen.getByRole("region", { name: "Задание: Первый заголовок" })
    ).toBeInTheDocument();
    expect(check("Есть заголовок h1")).toHaveTextContent("пока нет");
    expect(editor()).not.toHaveFocus();
  });

  it("marks checks as the learner types and celebrates when all pass", async () => {
    render(<ChallengeBlock challenge={heading} />);
    await userEvent.clear(editor());
    await userEvent.type(editor(), "<h1>Пока</h1>");

    expect(await screen.findByText(/— выполнено/)).toBeInTheDocument();
    expect(check("Есть заголовок h1")).toHaveTextContent("выполнено");
    expect(check("В заголовке слово «Привет»")).toHaveTextContent("пока нет");

    await userEvent.clear(editor());
    await userEvent.type(editor(), "<h1>Привет</h1>");
    expect(await screen.findByRole("status")).toHaveTextContent("Готово!");
  });

  it("remembers a solved challenge in this browser", async () => {
    const { unmount } = render(<ChallengeBlock challenge={heading} />);
    await userEvent.click(
      screen.getByRole("button", { name: "Показать решение" })
    );
    await screen.findByText("Готово!", { exact: false });
    unmount();

    render(<ChallengeBlock challenge={heading} />);
    expect(await screen.findByText("решено")).toBeInTheDocument();
  });

  it("shows the hint on request and hides the hint button", async () => {
    render(<ChallengeBlock challenge={heading} />);
    await userEvent.click(screen.getByRole("button", { name: "Подсказка" }));
    expect(screen.getByText(/пишется тегом/)).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Подсказка" })
    ).not.toBeInTheDocument();
  });

  it("puts the solution into the editor and can start over", async () => {
    render(<ChallengeBlock challenge={heading} />);
    const reset = screen.getByRole("button", { name: "Начать заново" });
    expect(reset).toBeDisabled();

    await userEvent.click(
      screen.getByRole("button", { name: "Показать решение" })
    );
    expect(editor()).toHaveValue(heading.solution);
    expect(reset).toBeEnabled();

    await userEvent.click(reset);
    expect(editor()).toHaveValue(heading.start);
  });

  it("keeps a check that requires an element to be absent", async () => {
    render(
      <ChallengeBlock
        challenge={{
          ...heading,
          checks: [{ label: "Нет тега font", selector: "font", absent: true }]
        }}
      />
    );
    expect(await screen.findByText(/— выполнено/)).toBeInTheDocument();
    await userEvent.type(editor(), "<font>старьё</font>");
    expect(await screen.findByText(/— пока нет/)).toBeInTheDocument();
  });
});

describe("ChallengeFence", () => {
  it("renders the fallback for a malformed challenge", () => {
    render(<ChallengeFence source="{ not json" fallback={<pre>код</pre>} />);
    expect(screen.getByText("код")).toBeInTheDocument();
    expect(screen.queryByRole("region")).not.toBeInTheDocument();
  });

  it("renders a valid challenge from its JSON source", () => {
    render(<ChallengeFence source={JSON.stringify(heading)} fallback={null} />);
    expect(
      screen.getByRole("heading", { name: "Первый заголовок" })
    ).toBeInTheDocument();
  });
});
