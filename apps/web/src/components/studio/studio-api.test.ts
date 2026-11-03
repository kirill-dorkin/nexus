import { beforeEach, describe, expect, it, vi } from "vitest";

import { browserApiRequest } from "../../lib/public-api";
import { errorMessage, StudioError, studioRequest } from "./studio-api";

vi.mock("../../lib/public-api", () => ({
  browserApiRequest: vi.fn()
}));
const api = vi.mocked(browserApiRequest);

function reply(status: number, body?: unknown) {
  api.mockResolvedValueOnce(
    new Response(body === undefined ? null : JSON.stringify(body), { status })
  );
}
async function rejection(promise: Promise<unknown>): Promise<StudioError> {
  try {
    await promise;
  } catch (error) {
    if (error instanceof StudioError) return error;
  }
  throw new Error("Expected a StudioError");
}

beforeEach(() => {
  api.mockReset();
});

describe("studioRequest", () => {
  it("reads with GET and writes with a JSON POST", async () => {
    reply(200, { ok: 1 });
    reply(200, { ok: 2 });
    await expect(studioRequest("me/organizations")).resolves.toEqual({ ok: 1 });
    await expect(
      studioRequest("organizations/x/courses/manifest/validate", { a: 1 })
    ).resolves.toEqual({ ok: 2 });
    expect(api).toHaveBeenNthCalledWith(1, "/v1/me/organizations", {});
    expect(api).toHaveBeenNthCalledWith(
      2,
      "/v1/organizations/x/courses/manifest/validate",
      {
        method: "POST",
        body: JSON.stringify({ a: 1 })
      }
    );
  });

  it("lists field issues of a rejected document", async () => {
    reply(400, {
      message: "Request validation failed.",
      issues: [
        { path: "course.title", message: "Too short" },
        { path: "lessons", message: "Required" }
      ]
    });
    const error = await rejection(studioRequest("x", {}));
    expect(error.status).toBe(400);
    expect(error.message).toBe("course.title: Too short\nlessons: Required");
  });

  it("falls back to a generic message for an unreadable 400 body", async () => {
    api.mockResolvedValueOnce(new Response("<html>", { status: 400 }));
    expect((await rejection(studioRequest("x", {}))).message).toBe(
      "Проверьте поля документа."
    );
  });

  it.each([
    [401, "Войдите в аккаунт."],
    [403, "Недостаточно прав для авторинга в этой организации."],
    [404, "Курс недоступен."],
    [409, "Черновик изменился"],
    [500, "Не удалось завершить операцию."]
  ])("explains status %i", async (status, text) => {
    reply(status);
    const error = await rejection(studioRequest("x"));
    expect(error.status).toBe(status);
    expect(error.message).toContain(text);
  });
});

describe("errorMessage", () => {
  it("uses an Error's message and a generic text for anything else", () => {
    expect(errorMessage(new StudioError(409, "Конфликт"))).toBe("Конфликт");
    expect(errorMessage("boom")).toBe("Не удалось завершить операцию.");
  });
});
