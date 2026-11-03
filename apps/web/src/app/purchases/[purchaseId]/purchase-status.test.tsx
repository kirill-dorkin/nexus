import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { browserApiRequest } from "../../../lib/public-api";
import { json } from "../../../test/fixtures";
import { PurchaseStatus } from "./purchase-status";

vi.mock("../../../lib/public-api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../../lib/public-api")>()),
  browserApiRequest: vi.fn()
}));
const api = vi.mocked(browserApiRequest);

const id = "0195d9a8-6c8e-7000-8000-0000000000b1";
const purchase = (status: "pending" | "paid") => ({
  id,
  priceId: "0195d9a8-6c8e-7000-8000-0000000000a1",
  status,
  amountMinor: 99000,
  currency: "RUB",
  billingType: "one_time",
  idempotencyKey: "0195d9a8-6c8e-7000-8000-0000000000c1",
  createdAt: "2026-11-03T10:00:00.000Z",
  paidAt: status === "paid" ? "2026-11-03T10:01:00.000Z" : null
});

/** Lets pending promises and React updates settle, then moves the clock. */
async function advance(ms: number) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
}

beforeEach(() => {
  vi.useFakeTimers();
  api.mockReset();
});
afterEach(() => {
  vi.useRealTimers();
});

describe("PurchaseStatus", () => {
  it("polls a pending purchase until the platform confirms payment", async () => {
    api
      .mockResolvedValueOnce(json(200, purchase("pending")))
      .mockResolvedValueOnce(json(200, purchase("pending")))
      .mockResolvedValueOnce(json(200, purchase("paid")));
    render(<PurchaseStatus purchaseId={id} />);
    expect(
      screen.getByText("Получаем канонический статус покупки…")
    ).toBeInTheDocument();

    await advance(0);
    expect(screen.getByText(/Платёж ещё обрабатывается/)).toBeInTheDocument();
    expect(screen.getByText("Ожидается")).toBeInTheDocument();

    await advance(2000);
    await advance(2000);
    expect(
      screen.getByText("Оплата подтверждена платформой.")
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Проверить сейчас" })
    ).not.toBeInTheDocument();

    await advance(10_000);
    expect(api).toHaveBeenCalledTimes(3);
  });

  it("stops polling after the automatic read budget", async () => {
    api.mockImplementation(() =>
      Promise.resolve(json(200, purchase("pending")))
    );
    render(<PurchaseStatus purchaseId={id} />);
    await advance(2000 * 40);
    expect(api).toHaveBeenCalledTimes(30);
    expect(
      screen.getByRole("button", { name: "Проверить сейчас" })
    ).toBeInTheDocument();
  });

  it("explains a purchase of another account and can check again", async () => {
    api
      .mockResolvedValueOnce(json(404))
      .mockResolvedValueOnce(json(200, purchase("paid")));
    render(<PurchaseStatus purchaseId={id} />);
    await advance(0);
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Покупка не найдена для текущего аккаунта."
    );

    fireEvent.click(screen.getByRole("button", { name: "Проверить снова" }));
    await advance(0);
    expect(screen.getByText("Оплачено")).toBeInTheDocument();
  });

  it("asks to sign in again when the session ended", async () => {
    api.mockResolvedValueOnce(json(401));
    render(<PurchaseStatus purchaseId={id} />);
    await advance(0);
    expect(screen.getByRole("alert")).toHaveTextContent("Сессия завершилась.");
  });

  it("stops polling when the page is left", async () => {
    api.mockImplementation(() =>
      Promise.resolve(json(200, purchase("pending")))
    );
    const { unmount } = render(<PurchaseStatus purchaseId={id} />);
    await advance(0);
    unmount();
    await advance(20_000);
    expect(api).toHaveBeenCalledTimes(1);
  });
});
