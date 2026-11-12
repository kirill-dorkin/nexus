import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { browserApiRequest } from "../../../lib/public-api";
import { HOME_ORGANIZATION_SLUG } from "../../../lib/public-learning-routes";
import { json } from "../../../test/fixtures";
import { MySubscription } from "./my-subscription";

vi.mock("../../../lib/public-api", () => ({ browserApiRequest: vi.fn() }));
const api = vi.mocked(browserApiRequest);
const path = `/v1/me/subscriptions/${HOME_ORGANIZATION_SLUG}`;

const access = {
  access: "subscription",
  until: "2026-12-15T00:00:00.000Z",
  trialEndsAt: "2026-11-08T00:00:00.000Z"
};
const subscription = (status: string) => ({
  id: "0195f3a0-0000-7000-8000-000000000009",
  status,
  amountMinor: 99000,
  currency: "RUB",
  billingPeriod: "month",
  currentPeriodEnd: "2026-12-13T00:00:00.000Z",
  cancelledAt: status === "cancelled" ? "2026-11-13T00:00:00.000Z" : null
});

function routes(table: Record<string, Response[]>) {
  api.mockImplementation((p) => {
    const next = table[p]?.shift();
    return next
      ? Promise.resolve(next)
      : Promise.reject(new Error(`Unexpected ${p}`));
  });
}

beforeEach(() => {
  api.mockReset();
});
afterEach(() => {
  vi.unstubAllGlobals();
});

describe("MySubscription", () => {
  it("shows the next charge and cancels after confirmation", async () => {
    vi.stubGlobal(
      "confirm",
      vi.fn(() => true)
    );
    routes({
      [path]: [json(200, { subscription: subscription("active"), access })],
      [`${path}/cancel`]: [
        json(200, { subscription: subscription("cancelled"), access })
      ]
    });
    render(<MySubscription />);
    expect(await screen.findByText("Активна")).toBeVisible();
    expect(screen.getByText(/Следующее списание/)).toBeVisible();
    await userEvent.click(
      screen.getByRole("button", { name: "Отменить подписку" })
    );
    expect(await screen.findByText("Отменена")).toBeVisible();
    expect(screen.getByText(/Доступ открыт до/)).toBeVisible();
    expect(screen.getByRole("link", { name: "Оформить снова" })).toBeVisible();
  });

  it("keeps the subscription when cancellation is not confirmed or fails", async () => {
    const confirm = vi.fn<() => boolean>(() => false);
    vi.stubGlobal("confirm", confirm);
    routes({
      [path]: [json(200, { subscription: subscription("past_due"), access })],
      [`${path}/cancel`]: [json(502)]
    });
    render(<MySubscription />);
    expect(await screen.findByText(/Не получилось списать/)).toBeVisible();
    const cancel = screen.getByRole("button", { name: "Отменить подписку" });
    await userEvent.click(cancel);
    expect(api).toHaveBeenCalledTimes(1);
    confirm.mockReturnValue(true);
    await userEvent.click(cancel);
    expect(await screen.findByText(/Не удалось отменить/)).toBeVisible();
  });

  it("shows the trial, a closed subscription, sign-in and no membership", async () => {
    routes({
      [path]: [
        json(200, {
          subscription: null,
          access: {
            ...access,
            access: "trial",
            until: "2026-11-20T00:00:00.000Z"
          }
        })
      ]
    });
    const { unmount } = render(<MySubscription />);
    expect(await screen.findByText(/пробный доступ/)).toBeVisible();
    unmount();

    routes({
      [path]: [json(200, { subscription: subscription("revoked"), access })]
    });
    const second = render(<MySubscription />);
    expect(await screen.findByText("Доступ закрыт.")).toBeVisible();
    second.unmount();

    routes({ [path]: [json(401)] });
    const third = render(<MySubscription />);
    expect(await screen.findByRole("link", { name: "Войти" })).toHaveAttribute(
      "href",
      `/login?returnTo=${encodeURIComponent("/me/subscription")}`
    );
    third.unmount();

    routes({ [path]: [json(404)] });
    render(<MySubscription />);
    expect(await screen.findByText(/Подписки пока нет/)).toBeVisible();
    await waitFor(() => {
      expect(api).toHaveBeenCalled();
    });
  });
});
