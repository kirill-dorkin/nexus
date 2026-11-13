import { SUBSCRIPTION_TERMS_VERSION } from "@platform/contracts/client";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { browserApiRequest } from "../../lib/public-api";
import { HOME_ORGANIZATION_SLUG } from "../../lib/public-learning-routes";
import { json } from "../../test/fixtures";
import { SubscriptionOffers } from "./subscription-offers";

vi.mock("../../lib/public-api", () => ({ browserApiRequest: vi.fn() }));
const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
const api = vi.mocked(browserApiRequest);
const org = HOME_ORGANIZATION_SLUG;

const offer = (id: string, billingPeriod: string, amountMinor: number) => ({
  priceId: `0195f3a0-0000-7000-8000-00000000000${id}`,
  planSlug: "full",
  planName: "Полный доступ",
  amountMinor,
  currency: "RUB",
  billingPeriod
});
const offers = {
  offers: [
    offer("1", "month", 99000),
    offer("2", "days_90", 249000),
    offer("3", "year", 690000),
    { ...offer("4", "month", 1199), currency: "USD" }
  ]
};
const access = {
  access: "trial",
  until: "2026-11-20T00:00:00.000Z",
  trialEndsAt: "2026-11-20T00:00:00.000Z"
};

function routes(table: Record<string, Response[]>) {
  api.mockImplementation((path) => {
    const next = table[path]?.shift();
    return next
      ? Promise.resolve(next)
      : Promise.reject(new Error(`Unexpected ${path}`));
  });
}

const assign = vi.fn();
beforeEach(() => {
  api.mockReset();
  push.mockReset();
  assign.mockReset();
  vi.stubGlobal("location", { assign, search: "" });
});
afterEach(() => {
  vi.unstubAllGlobals();
});

describe("SubscriptionOffers", () => {
  it("preselects the year in roubles and pays only after the renewal consent", async () => {
    routes({
      [`/v1/public/organizations/${org}/subscription-offers`]: [
        json(200, offers)
      ],
      [`/v1/me/subscriptions/${org}`]: [
        json(200, { subscription: null, access })
      ],
      [`/v1/me/subscriptions/${org}/checkout`]: [
        json(200, { paymentUrl: "https://pay.lava.top/abc" })
      ]
    });
    render(<SubscriptionOffers />);
    const year = await screen.findByRole("radio", { name: /Год/ });
    expect(year).toBeChecked();
    expect(screen.queryByText(/\$/)).toBeNull();
    const pay = screen.getByRole("button", { name: "Перейти к оплате" });
    expect(pay).toBeDisabled();

    await userEvent.click(screen.getByRole("radio", { name: /3 месяца/ }));
    await userEvent.click(screen.getByRole("checkbox"));
    await userEvent.click(pay);

    await waitFor(() => {
      expect(assign).toHaveBeenCalledWith("https://pay.lava.top/abc");
    });
    const [, init] = api.mock.calls.find(
      ([path]) => path === `/v1/me/subscriptions/${org}/checkout`
    )!;
    expect(JSON.parse(init?.body as string)).toMatchObject({
      priceId: offer("2", "days_90", 249000).priceId,
      acceptRenewalTerms: true,
      termsVersion: SUBSCRIPTION_TERMS_VERSION
    });
  });

  it("joins the academy first when the learner is not a member yet", async () => {
    routes({
      [`/v1/public/organizations/${org}/subscription-offers`]: [
        json(200, offers)
      ],
      [`/v1/me/subscriptions/${org}`]: [json(404)],
      [`/v1/me/subscriptions/${org}/checkout`]: [
        json(404),
        json(200, { paymentUrl: "https://pay.lava.top/joined" })
      ],
      [`/v1/public/organizations/${org}/memberships/me`]: [json(200, {})]
    });
    render(<SubscriptionOffers />);
    await userEvent.click(await screen.findByRole("checkbox"));
    await userEvent.click(
      screen.getByRole("button", { name: "Перейти к оплате" })
    );
    await waitFor(() => {
      expect(assign).toHaveBeenCalledWith("https://pay.lava.top/joined");
    });
  });

  it("sends an anonymous visitor to registration", async () => {
    routes({
      [`/v1/public/organizations/${org}/subscription-offers`]: [
        json(200, offers)
      ],
      [`/v1/me/subscriptions/${org}`]: [json(401)]
    });
    render(<SubscriptionOffers />);
    await userEvent.click(await screen.findByRole("checkbox"));
    await userEvent.click(
      screen.getByRole("button", { name: "Создать аккаунт и оформить" })
    );
    expect(push).toHaveBeenCalledWith(
      `/login?returnTo=${encodeURIComponent("/subscription")}&mode=register`
    );
  });

  it("explains errors and the state before sales open", async () => {
    routes({
      [`/v1/public/organizations/${org}/subscription-offers`]: [
        json(200, offers)
      ],
      [`/v1/me/subscriptions/${org}`]: [
        json(200, { subscription: null, access })
      ],
      [`/v1/me/subscriptions/${org}/checkout`]: [json(503), json(409)]
    });
    render(<SubscriptionOffers />);
    await userEvent.click(await screen.findByRole("checkbox"));
    const pay = screen.getByRole("button", { name: "Перейти к оплате" });
    await userEvent.click(pay);
    expect(await screen.findByText(/скоро откроется/)).toBeVisible();
    await userEvent.click(pay);
    expect(await screen.findByText(/уже есть подписка/)).toBeVisible();
  });

  it("says when nothing is on sale and when a subscription already runs", async () => {
    routes({
      [`/v1/public/organizations/${org}/subscription-offers`]: [
        json(200, { offers: [] })
      ],
      [`/v1/me/subscriptions/${org}`]: [
        json(200, {
          subscription: {
            id: "0195f3a0-0000-7000-8000-000000000009",
            status: "active",
            amountMinor: 99000,
            currency: "RUB",
            billingPeriod: "month",
            currentPeriodEnd: "2026-12-13T00:00:00.000Z",
            cancelledAt: null
          },
          access: { ...access, access: "subscription" }
        })
      ]
    });
    render(<SubscriptionOffers />);
    expect(await screen.findByText(/скоро откроется/)).toBeVisible();
    expect(
      await screen.findByRole("link", { name: "Открыть «Мою подписку»" })
    ).toHaveAttribute("href", "/me/subscription");
  });
});
