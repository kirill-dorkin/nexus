import { afterEach, describe, expect, it, vi } from "vitest";

import { PaddlePaymentCheckoutProvider } from "./paddle-payment-checkout.provider";

describe("PaddlePaymentCheckoutProvider", () => {
  const original = {
    provider: process.env.PAYMENT_PROVIDER,
    apiKey: process.env.PADDLE_API_KEY,
    environment: process.env.PADDLE_ENVIRONMENT,
    taxCategory: process.env.PADDLE_TAX_CATEGORY
  };

  afterEach(() => {
    vi.unstubAllGlobals();
    if (original.provider === undefined) delete process.env.PAYMENT_PROVIDER;
    else process.env.PAYMENT_PROVIDER = original.provider;
    if (original.apiKey === undefined) delete process.env.PADDLE_API_KEY;
    else process.env.PADDLE_API_KEY = original.apiKey;
    if (original.environment === undefined) delete process.env.PADDLE_ENVIRONMENT;
    else process.env.PADDLE_ENVIRONMENT = original.environment;
    if (original.taxCategory === undefined) delete process.env.PADDLE_TAX_CATEGORY;
    else process.env.PADDLE_TAX_CATEGORY = original.taxCategory;
  });

  it("creates a server-priced one-time Paddle transaction without catalog identity", async () => {
    process.env.PAYMENT_PROVIDER = "paddle";
    process.env.PADDLE_API_KEY = "pdl_sdbx_apikey_test";
    process.env.PADDLE_ENVIRONMENT = "sandbox";
    process.env.PADDLE_TAX_CATEGORY = "training-services";

    const fetchMock = vi.fn<typeof fetch>(async () =>
      new Response(
        JSON.stringify({
          data: {
            id: "txn_01h04vsbhqc62t8hmd4z3b578c",
            checkout: {
              url: "https://checkout.paddle.test/pay?_ptxn=txn_example"
            }
          }
        }),
        {
          status: 201,
          headers: { "content-type": "application/json" }
        }
      )
    );
    vi.stubGlobal("fetch", fetchMock);

    const provider = new PaddlePaymentCheckoutProvider();
    const result = await provider.createCheckout({
      organizationId: "018f47f1-16ce-7d1f-8f65-c61d8be24a31",
      purchaseId: "018f47f1-16ce-7d1f-8f65-c61d8be24a32",
      productName: "Professional JavaScript",
      amountMinor: 12900,
      currency: "USD"
    });

    expect(result).toEqual({
      providerKey: "paddle",
      externalCheckoutId: "txn_01h04vsbhqc62t8hmd4z3b578c",
      checkoutUrl: "https://checkout.paddle.test/pay?_ptxn=txn_example",
      expiresAt: null
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] ?? [];
    expect(url).toBe("https://sandbox-api.paddle.com/transactions");
    expect(init?.method).toBe("POST");
    expect(init?.headers).toMatchObject({
      Authorization: "Bearer pdl_sdbx_apikey_test",
      "Content-Type": "application/json",
      "Paddle-Version": "1"
    });

    expect(JSON.parse(String(init?.body))).toEqual({
      items: [
        {
          quantity: 1,
          price: {
            description:
              "Nexus purchase 018f47f1-16ce-7d1f-8f65-c61d8be24a32",
            name: "Professional JavaScript",
            billing_cycle: null,
            trial_period: null,
            tax_mode: "external",
            unit_price: {
              amount: "12900",
              currency_code: "USD"
            },
            quantity: {
              minimum: 1,
              maximum: 1
            },
            product: {
              name: "Professional JavaScript",
              tax_category: "training-services"
            }
          }
        }
      ],
      collection_mode: "automatic",
      custom_data: {
        nexus_purchase_id: "018f47f1-16ce-7d1f-8f65-c61d8be24a32",
        nexus_organization_id: "018f47f1-16ce-7d1f-8f65-c61d8be24a31"
      }
    });
  });
});
