import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { browserApiRequest } from "../../lib/public-api";
import { FeedbackInbox } from "./feedback-inbox";

vi.mock("../../lib/public-api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../lib/public-api")>()),
  browserApiRequest: vi.fn()
}));
const api = vi.mocked(browserApiRequest);

const organizationId = "0195d9a8-6c8e-7000-8000-0000000000aa";
const report = {
  id: "0195d9a8-6c8e-7000-8000-0000000000bb",
  kind: "problem",
  text: "Кнопка проверки не реагирует",
  expected: "Увидеть результат",
  actual: null,
  route: "/courses/[course]/[lesson]",
  courseSlug: "html",
  lessonSlug: "tags",
  release: "abc123def456",
  device: "mobile",
  signedIn: false,
  status: "new",
  ownerNote: null,
  createdAt: "2026-11-06T01:00:00.000Z",
  updatedAt: "2026-11-06T01:00:00.000Z"
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status });

beforeEach(() => api.mockReset());

describe("FeedbackInbox", () => {
  it("lists new reports with their lesson and changes a status", async () => {
    api.mockImplementation((path, init) =>
      Promise.resolve(
        init?.method === "PATCH"
          ? json({ ...report, status: "done" })
          : json({ reports: [report], nextCursor: null })
      )
    );
    render(<FeedbackInbox organizationId={organizationId} />);

    expect(
      await screen.findByText("Кнопка проверки не реагирует")
    ).toBeInTheDocument();
    expect(api.mock.calls[0]?.[0]).toBe(
      `/v1/organizations/${organizationId}/feedback?status=new`
    );
    expect(
      screen.getByRole("link", { name: "Урок html/tags" })
    ).toHaveAttribute("href", "/courses/html/tags");

    await userEvent.selectOptions(
      screen.getByRole("combobox", { name: "Статус" }),
      "done"
    );
    await waitFor(() =>
      expect(screen.getByRole("combobox", { name: "Статус" })).toHaveValue(
        "done"
      )
    );
    const patch = api.mock.calls.find(([, init]) => init?.method === "PATCH");
    expect(patch?.[0]).toBe(
      `/v1/organizations/${organizationId}/feedback/${report.id}`
    );
    expect(JSON.parse(patch?.[1]?.body as string)).toEqual({ status: "done" });
  });

  it("explains that only admins see reports", async () => {
    api.mockResolvedValue(json({}, 403));
    render(<FeedbackInbox organizationId={organizationId} />);
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "только владелец и администраторы"
    );
  });
});
