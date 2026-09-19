import { ServiceUnavailableException } from "@nestjs/common";

import {
  PaymentCheckoutProvider,
  type CreateProviderCheckoutInput,
  type ProviderCheckout
} from "../application/payment-checkout.provider";

const stripeApiVersion = "2026-08-26.dahlia";

function requireConfigured(name: string): string {
  const value = process.env[name];
  if (value === undefined || value.trim().length === 0) {
    throw new ServiceUnavailableException(
      `${name} is required for Stripe Checkout.`
    );
  }
  return value;
}

function requireStripeCheckoutResponse(value: unknown): {
  id: string;
  url: string;
  expiresAt: Date;
} {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new ServiceUnavailableException(
      "Stripe Checkout returned an invalid response."
    );
  }
  const object = value as Record<string, unknown>;
  const id = object.id;
  const url = object.url;
  const expiresAt = object.expires_at;
  if (
    typeof id !== "string" ||
    id.length < 3 ||
    typeof url !== "string" ||
    url.length < 8 ||
    typeof expiresAt !== "number" ||
    !Number.isSafeInteger(expiresAt) ||
    expiresAt <= 0
  ) {
    throw new ServiceUnavailableException(
      "Stripe Checkout returned an incomplete session."
    );
  }
  return { id, url, expiresAt: new Date(expiresAt * 1000) };
}

export class StripePaymentCheckoutProvider extends PaymentCheckoutProvider {
  async createCheckout(
    input: CreateProviderCheckoutInput
  ): Promise<ProviderCheckout> {
    if (process.env.PAYMENT_PROVIDER === "test") {
      if (process.env.NODE_ENV !== "test") {
        throw new ServiceUnavailableException(
          "The test payment provider is only available in NODE_ENV=test."
        );
      }
      return {
        providerKey: "stripe",
        externalCheckoutId: `cs_test_${input.purchaseId.replaceAll("-", "")}`,
        checkoutUrl: `https://checkout.test/${input.purchaseId}`,
        expiresAt: new Date(Date.now() + 30 * 60 * 1000)
      };
    }

    if (process.env.PAYMENT_PROVIDER !== "stripe") {
      throw new ServiceUnavailableException(
        "A production payment provider is not configured."
      );
    }

    const secretKey = requireConfigured("STRIPE_SECRET_KEY");
    const successUrl = requireConfigured("STRIPE_CHECKOUT_SUCCESS_URL");
    const cancelUrl = requireConfigured("STRIPE_CHECKOUT_CANCEL_URL");
    const body = new URLSearchParams({
      mode: "payment",
      "payment_method_types[0]": "card",
      success_url: successUrl,
      cancel_url: cancelUrl,
      client_reference_id: input.purchaseId,
      "metadata[platform_purchase_id]": input.purchaseId,
      "metadata[platform_organization_id]": input.organizationId,
      "line_items[0][price_data][currency]": input.currency.toLowerCase(),
      "line_items[0][price_data][unit_amount]": String(input.amountMinor),
      "line_items[0][price_data][product_data][name]": input.productName,
      "line_items[0][quantity]": "1"
    });

    let response: Response;
    try {
      response = await fetch("https://api.stripe.com/v1/checkout/sessions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${secretKey}`,
          "Content-Type": "application/x-www-form-urlencoded",
          "Idempotency-Key": `commerce-purchase-${input.purchaseId}`,
          "Stripe-Version": stripeApiVersion
        },
        body
      });
    } catch {
      throw new ServiceUnavailableException(
        "Stripe Checkout is temporarily unavailable."
      );
    }

    if (!response.ok) {
      throw new ServiceUnavailableException(
        "Stripe Checkout rejected the session request."
      );
    }

    const checkout = requireStripeCheckoutResponse(await response.json());
    return {
      providerKey: "stripe",
      externalCheckoutId: checkout.id,
      checkoutUrl: checkout.url,
      expiresAt: checkout.expiresAt
    };
  }
}
