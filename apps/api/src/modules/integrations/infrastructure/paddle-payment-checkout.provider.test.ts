import { afterEach, describe, expect, it, vi } from "vitest";

import { PaddlePaymentCheckoutProvider } from "./paddle-payment-checkout.provider";

describe("PaddlePaymentCheckoutProvider", () => {
  const original = {
    provider: process.env.PAYMENT_PROVIDER,
    apiKey: process.env.PADDLE_API_KEY,
    environment: process.env.PADDLE_ENVIRONMENT,
    taxCategory: process.env.PADDLE_TAX_CATEGORY,
    webOrigin: process.env.WEB_APP_ORIGIN
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
    if (original.webOrigin === undefined) delete process.env.WEB_APP_ORIGIN;
    else process.env.WEB_APP_ORIGIN = original.webOrigin;
  });

  it("creates a server-priced transaction pinned to the Nexus payment-link page", async () => {
    process.env.PAYMENT_PROVIDER = "paddle";
    process.env.PADDLE_API_KEY = "pdl_sdbx_apikey_test";
    process.env.PADDLE_ENVIRONMENT = "sandbox";
    process.env.PADDLE_TAX_CATEGORY = "training-services";
    process.env.WEB_APP_ORIGIN = "https://app.example.test";

    const purchaseId = "018f47f1-16ce-7d1f-8f65-c61d8be24a32";
    const transactionId = "txn_01h04vsbhqc62t8hmd4z3b578c";
    const checkoutBase = `https://app.example.test/checkout/paddle/${purchaseId}`;
    const fetchMock = vi.fn<typeof fetch>(async () =>
      new Response(
        JSON.stringify({
          data: {
            id: transactionId,
            checkout: {
              url: `${checkoutBase}?_ptxn=${transactionId}`
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
    expect(provider.providerKey).toBe("paddle");
    const result = await provider.createCheckout({
      organizationId: "018f47f1-16ce-7d1f-8f65-c61d8be24a31",
      purchaseId,
      productName: "Professional JavaScript",
      amountMinor: 12900,
      currency: "USD"
    });

    expect(result).toEqual({
      externalCheckoutId: transactionId,
      checkoutUrl: `${checkoutBase}?_ptxn=${transactionId}`,
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
            description: `Platform purchase ${purchaseId}`,
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
      checkout: {
        url: checkoutBase
      },
      custom_data: {
        platform_purchase_id: purchaseId,
        platform_organization_id: "018f47f1-16ce-7d1f-8f65-c61d8be24a31"
      }
    });
  });

  it("rejects a provider checkout URL that escapes the configured Nexus page", async () => {
    process.env.PAYMENT_PROVIDER = "paddle";
    process.env.PADDLE_API_KEY = "pdl_sdbx_apikey_test";
    process.env.PADDLE_ENVIRONMENT = "sandbox";
    process.env.PADDLE_TAX_CATEGORY = "training-services";
    process.env.WEB_APP_ORIGIN = "https://app.example.test";

    const transactionId = "txn_01h04vsbhqc62t8hmd4z3b578c";
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>(async () =>
        new Response(
          JSON.stringify({
            data: {
              id: transactionId,
              checkout: {
                url: `https://evil.example.test/pay?_ptxn=${transactionId}`
              }
            }
          }),
          { status: 201, headers: { "content-type": "application/json" } }
        )
      )
    );

    const provider = new PaddlePaymentCheckoutProvider();
    await expect(
      provider.createCheckout({
        organizationId: "018f47f1-16ce-7d1f-8f65-c61d8be24a31",
        purchaseId: "018f47f1-16ce-7d1f-8f65-c61d8be24a32",
        productName: "Professional JavaScript",
        amountMinor: 12900,
        currency: "USD"
      })
    ).rejects.toThrow("Paddle returned an unexpected checkout URL.");
  });
});
