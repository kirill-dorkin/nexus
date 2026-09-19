import { afterEach, describe, expect, it, vi } from "vitest";

import { StripePaymentCheckoutProvider } from "./stripe-payment-checkout.provider";

describe("StripePaymentCheckoutProvider", () => {
  const original = {
    provider: process.env.PAYMENT_PROVIDER,
    secret: process.env.STRIPE_SECRET_KEY,
    success: process.env.STRIPE_CHECKOUT_SUCCESS_URL,
    cancel: process.env.STRIPE_CHECKOUT_CANCEL_URL
  };

  afterEach(() => {
    vi.unstubAllGlobals();
    if (original.provider === undefined) delete process.env.PAYMENT_PROVIDER;
    else process.env.PAYMENT_PROVIDER = original.provider;
    if (original.secret === undefined) delete process.env.STRIPE_SECRET_KEY;
    else process.env.STRIPE_SECRET_KEY = original.secret;
    if (original.success === undefined) {
      delete process.env.STRIPE_CHECKOUT_SUCCESS_URL;
    } else {
      process.env.STRIPE_CHECKOUT_SUCCESS_URL = original.success;
    }
    if (original.cancel === undefined) {
      delete process.env.STRIPE_CHECKOUT_CANCEL_URL;
    } else {
      process.env.STRIPE_CHECKOUT_CANCEL_URL = original.cancel;
    }
  });

  it("creates a server-priced hosted Checkout Session with Purchase idempotency", async () => {
    process.env.PAYMENT_PROVIDER = "stripe";
    process.env.STRIPE_SECRET_KEY = "sk_test_example";
    process.env.STRIPE_CHECKOUT_SUCCESS_URL =
      "https://example.test/checkout/success";
    process.env.STRIPE_CHECKOUT_CANCEL_URL =
      "https://example.test/checkout/cancel";

    const fetchMock = vi.fn(async () =>
      new Response(
        JSON.stringify({
          id: "cs_test_checkout",
          url: "https://checkout.stripe.test/session",
          expires_at: 1_800_000_000
        }),
        {
          status: 200,
          headers: { "content-type": "application/json" }
        }
      )
    );
    vi.stubGlobal("fetch", fetchMock);

    const provider = new StripePaymentCheckoutProvider();
    const result = await provider.createCheckout({
      organizationId: "018f47f1-16ce-7d1f-8f65-c61d8be24a31",
      purchaseId: "018f47f1-16ce-7d1f-8f65-c61d8be24a32",
      productName: "Professional JavaScript",
      amountMinor: 12900,
      currency: "USD"
    });

    expect(result).toEqual({
      providerKey: "stripe",
      externalCheckoutId: "cs_test_checkout",
      checkoutUrl: "https://checkout.stripe.test/session",
      expiresAt: new Date(1_800_000_000 * 1000)
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] ?? [];
    expect(url).toBe("https://api.stripe.com/v1/checkout/sessions");
    expect(init?.method).toBe("POST");
    expect(init?.headers).toMatchObject({
      Authorization: "Bearer sk_test_example",
      "Content-Type": "application/x-www-form-urlencoded",
      "Idempotency-Key":
        "commerce-purchase-018f47f1-16ce-7d1f-8f65-c61d8be24a32",
      "Stripe-Version": "2026-08-26.dahlia"
    });

    const body = init?.body;
    expect(body).toBeInstanceOf(URLSearchParams);
    const params = body as URLSearchParams;
    expect(params.get("mode")).toBe("payment");
    expect(params.get("payment_method_types[0]")).toBe("card");
    expect(params.get("line_items[0][price_data][currency]")).toBe("usd");
    expect(params.get("line_items[0][price_data][unit_amount]")).toBe("12900");
    expect(params.get("line_items[0][price_data][product_data][name]")).toBe(
      "Professional JavaScript"
    );
    expect(params.get("line_items[0][quantity]")).toBe("1");
    expect(params.get("client_reference_id")).toBe(
      "018f47f1-16ce-7d1f-8f65-c61d8be24a32"
    );
    expect(params.get("metadata[platform_purchase_id]")).toBe(
      "018f47f1-16ce-7d1f-8f65-c61d8be24a32"
    );
  });
});
