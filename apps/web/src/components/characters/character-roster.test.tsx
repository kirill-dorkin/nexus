import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { browserApiRequest } from "../../lib/public-api";
import { findCharacter } from "../../lib/skill-map/skill-map";
import { CharacterRoster } from "./character-roster";

vi.mock("../../lib/public-api", () => ({
  browserApiRequest: vi.fn()
}));
const api = vi.mocked(browserApiRequest);

const today = new Date().toISOString().slice(0, 10);
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" }
  });

beforeEach(() => {
  api.mockReset();
});

describe("character roster", () => {
  it("shows every character at level 0 for an anonymous visitor, without daily quests", async () => {
    api.mockResolvedValue(json({}, 401));
    render(<CharacterRoster />);
    expect(
      await screen.findByRole("progressbar", { name: "HTML: уровень 0 из 100" })
    ).toBeTruthy();
    expect(screen.queryByRole("heading", { name: "Сегодня" })).toBeNull();
  });

  it("levels a character from confirmations and lists today's quests", async () => {
    api.mockResolvedValue(
      json({
        skills: findCharacter("html")!.branches.flatMap((b) =>
          b.skills.map((s) => ({ skillKey: s.key, confirmedDays: [today] }))
        )
      })
    );
    render(<CharacterRoster />);
    expect(
      await screen.findByRole("progressbar", {
        name: "HTML: уровень 100 из 100"
      })
    ).toBeTruthy();
    const daily = screen.getByRole("region", { name: "Сегодня" });
    expect(within(daily).getByText(/серия 1 день/)).toBeTruthy();
    expect(within(daily).getAllByText(/выполнено/).length).toBeGreaterThan(0);
  });
});
