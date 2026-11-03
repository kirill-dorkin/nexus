import type { PublicCatalogProductResponse } from "@platform/contracts";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { browserApiRequest } from "../../../../../lib/public-api";
import { CheckoutPanel } from "./checkout-panel";

vi.mock("../../../../../lib/public-api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../../../../lib/public-api")>()),
  browserApiRequest: vi.fn()
}));
const api = vi.mocked(browserApiRequest);

const monthly = "0195d9a8-6c8e-7000-8000-0000000000a1";
const yearly = "0195d9a8-6c8e-7000-8000-0000000000a2";
const catalog: PublicCatalogProductResponse = {
  organization: { slug: "acme", name: "Acme", customerEntryPolicy: "open" },
  product: {
    slug: "web",
    name: "Веб-разработка",
    offering: {
      slug: "web-2026",
      name: "Поток 2026",
      deliveryMode: "self_paced",
      startsAt: null,
      endsAt: null
    },
    prices: [
      {
        id: monthly,
        amountMinor: 29000,
        currency: "RUB",
        billingType: "one_time"
      },
      {
        id: yearly,
        amountMinor: 99000,
        currency: "RUB",
        billingType: "one_time"
      }
    ]
  }
};
const user = {
  id: "0195d9a8-6c8e-7000-8000-000000000001",
  email: "buyer@example.com",
  displayName: "Ника",
  status: "active"
};
const checkout = {
  purchase: {
    id: "0195d9a8-6c8e-7000-8000-0000000000b1",
    priceId: yearly,
    status: "pending",
    amountMinor: 99000,
    currency: "RUB",
    billingType: "one_time",
    idempotencyKey: "0195d9a8-6c8e-7000-8000-0000000000c1",
    createdAt: "2026-11-03T10:00:00.000Z",
    paidAt: null
  },
  checkoutUrl: "https://pay.example.test/session/1",
  checkoutExpiresAt: null
};

function json(status: number, body: unknown = {}) {
  return new Response(JSON.stringify(body), { status });
}
const routes = new Map<string, (Response | Error)[]>();
/** Each path answers with its queued responses in order. */
function route(path: string, ...responses: (Response | Error)[]) {
  routes.set(path, [...(routes.get(path) ?? []), ...responses]);
}
const productPath = "/v1/public/catalog/acme/products/web";
const assign = vi.fn();

beforeEach(() => {
  routes.clear();
  sessionStorage.clear();
  api.mockReset();
  assign.mockReset();
  vi.spyOn(window.location, "assign").mockImplementation(assign);
  api.mockImplementation((path) => {
    const next = routes.get(path)?.shift();
    if (!next) return Promise.reject(new Error(`Unexpected request ${path}`));
    return next instanceof Error ? Promise.reject(next) : Promise.resolve(next);
  });
});
afterEach(() => {
  vi.unstubAllGlobals();
});

function signedIn() {
  route("/v1/me", json(200, user));
  render(<CheckoutPanel catalog={catalog} />);
}

describe("CheckoutPanel", () => {
  it("offers sign-in when there is no session", async () => {
    route("/v1/me", json(401));
    render(<CheckoutPanel catalog={catalog} />);
    expect(screen.getByText("Проверяем сессию…")).toBeInTheDocument();
    expect(
      await screen.findByRole("button", { name: "Войти", pressed: true })
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toBeRequired();
  });

  it("lists every price and selects the first one", () => {
    route("/v1/me", json(401));
    render(<CheckoutPanel catalog={catalog} />);
    const radios = screen.getAllByRole("radio");
    expect(radios).toHaveLength(2);
    expect(radios[0]).toBeChecked();
    expect(screen.getByRole("radio", { name: /990,00/ })).not.toBeChecked();
  });

  it("signs in inside the panel and shows the account", async () => {
    route("/v1/me", json(401));
    route("/v1/auth/login", json(200, user));
    render(<CheckoutPanel catalog={catalog} />);
    await userEvent.type(await screen.findByLabelText("Email"), user.email);
    await userEvent.type(
      screen.getByLabelText("Пароль"),
      "correct horse battery"
    );
    const submit = screen
      .getAllByRole("button", { name: "Войти" })
      .find((button) => button.getAttribute("type") === "submit");
    if (!submit) throw new Error("No sign-in submit button");
    await userEvent.click(submit);

    expect(await screen.findByText("Вы вошли в аккаунт.")).toBeInTheDocument();
    expect(screen.getByText(user.email)).toBeInTheDocument();
  });

  it("joins the organization, creates the purchase and goes to payment", async () => {
    route(productPath, json(200, catalog));
    route("/v1/public/organizations/acme/memberships/me", json(200));
    route(`${productPath}/checkout`, json(201, checkout));
    signedIn();

    await userEvent.click(await screen.findByRole("radio", { name: /990,00/ }));
    await userEvent.click(
      screen.getByRole("button", { name: "Присоединиться и перейти к оплате" })
    );

    await waitFor(() => {
      expect(assign).toHaveBeenCalledWith(checkout.checkoutUrl);
    });
    const body = JSON.parse(
      api.mock.calls.find(([path]) => path.endsWith("/checkout"))?.[1]
        ?.body as string
    ) as { priceId: string; idempotencyKey: string };
    expect(body.priceId).toBe(yearly);
    expect(sessionStorage.getItem(`checkout-attempt:acme:web:${yearly}`)).toBe(
      body.idempotencyKey
    );
  });

  it("reuses the purchase key when the learner tries again", async () => {
    route(productPath, json(200, catalog), json(200, catalog));
    route("/v1/public/organizations/acme/memberships/me", json(200), json(200));
    route(`${productPath}/checkout`, json(502), json(201, checkout));
    signedIn();

    const pay = await screen.findByRole("button", {
      name: "Присоединиться и перейти к оплате"
    });
    await userEvent.click(pay);
    expect(await screen.findByRole("alert")).toBeInTheDocument();
    await userEvent.click(pay);
    await waitFor(() => {
      expect(assign).toHaveBeenCalled();
    });

    const keys = api.mock.calls
      .filter(([path]) => path.endsWith("/checkout"))
      .map(
        ([, init]) =>
          (JSON.parse(init?.body as string) as { idempotencyKey: string })
            .idempotencyKey
      );
    expect(keys).toHaveLength(2);
    expect(keys[1]).toBe(keys[0]);
  });

  it("stops when the chosen price was withdrawn", async () => {
    route(
      productPath,
      json(200, {
        ...catalog,
        product: { ...catalog.product, prices: [catalog.product.prices[1]] }
      })
    );
    signedIn();
    await userEvent.click(
      await screen.findByRole("button", {
        name: "Присоединиться и перейти к оплате"
      })
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Выбранная цена больше недоступна."
    );
    expect(api.mock.calls.some(([path]) => path.endsWith("/checkout"))).toBe(
      false
    );
  });

  it("returns to sign-in when the session expired during checkout", async () => {
    route(productPath, json(200, catalog));
    route("/v1/public/organizations/acme/memberships/me", json(401));
    signedIn();
    await userEvent.click(
      await screen.findByRole("button", {
        name: "Присоединиться и перейти к оплате"
      })
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Сессия завершилась. Войдите снова."
    );
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
  });

  it("signs out", async () => {
    route("/v1/auth/logout", json(204));
    signedIn();
    await userEvent.click(await screen.findByRole("button", { name: "Выйти" }));
    expect(
      await screen.findByText("Вы вышли из аккаунта.")
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
  });
});
