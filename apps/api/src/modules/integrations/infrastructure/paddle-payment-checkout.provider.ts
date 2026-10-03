import { ServiceUnavailableException } from "@nestjs/common";

import {
  PaymentCheckoutProvider,
  type CreateProviderCheckoutInput,
  type ProviderCheckout
} from "../application/payment-checkout.provider";

const paddleApiVersion = "1";

function requireConfigured(name: string): string {
  const value = process.env[name];
  if (value === undefined || value.trim().length === 0) {
    throw new ServiceUnavailableException(
      `${name} is required for Paddle Checkout.`
    );
  }
  return value.trim();
}

function paddleBaseUrl(): string {
  const environment = requireConfigured("PADDLE_ENVIRONMENT");
  if (environment === "sandbox") return "https://sandbox-api.paddle.com";
  if (environment === "production") return "https://api.paddle.com";
  throw new ServiceUnavailableException(
    "PADDLE_ENVIRONMENT must be sandbox or production."
  );
}

function checkoutBaseUrl(purchaseId: string): string {
  const configured = requireConfigured("WEB_APP_ORIGIN");
  let url: URL;
  try {
    url = new URL(configured);
  } catch {
    throw new ServiceUnavailableException(
      "WEB_APP_ORIGIN must be an absolute HTTP(S) origin."
    );
  }
  if (
    (url.protocol !== "http:" && url.protocol !== "https:") ||
    url.origin !== configured ||
    url.pathname !== "/" ||
    url.search.length > 0 ||
    url.hash.length > 0 ||
    url.username.length > 0 ||
    url.password.length > 0
  ) {
    throw new ServiceUnavailableException(
      "WEB_APP_ORIGIN must be an absolute HTTP(S) origin."
    );
  }
  return `${url.origin}/checkout/paddle/${encodeURIComponent(purchaseId)}`;
}

function requirePaddleTransactionResponse(
  value: unknown,
  expectedCheckoutBaseUrl: string
): {
  id: string;
  url: string;
} {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new ServiceUnavailableException(
      "Paddle returned an invalid transaction response."
    );
  }
  const data = (value as Record<string, unknown>).data;
  if (typeof data !== "object" || data === null || Array.isArray(data)) {
    throw new ServiceUnavailableException(
      "Paddle returned an invalid transaction response."
    );
  }
  const transaction = data as Record<string, unknown>;
  const checkout = transaction.checkout;
  if (
    typeof checkout !== "object" ||
    checkout === null ||
    Array.isArray(checkout)
  ) {
    throw new ServiceUnavailableException(
      "Paddle transaction has no hosted checkout."
    );
  }
  const id = transaction.id;
  const url = (checkout as Record<string, unknown>).url;
  if (
    typeof id !== "string" ||
    !/^txn_[a-z\d]{26}$/.test(id) ||
    typeof url !== "string" ||
    url.length < 8
  ) {
    throw new ServiceUnavailableException(
      "Paddle returned an incomplete transaction."
    );
  }

  let returned: URL;
  let expected: URL;
  try {
    returned = new URL(url);
    expected = new URL(expectedCheckoutBaseUrl);
  } catch {
    throw new ServiceUnavailableException(
      "Paddle returned an invalid checkout URL."
    );
  }
  if (
    returned.origin !== expected.origin ||
    returned.pathname !== expected.pathname ||
    returned.searchParams.get("_ptxn") !== id ||
    returned.username.length > 0 ||
    returned.password.length > 0 ||
    returned.hash.length > 0
  ) {
    throw new ServiceUnavailableException(
      "Paddle returned an unexpected checkout URL."
    );
  }

  return { id, url: returned.toString() };
}

export class PaddlePaymentCheckoutProvider extends PaymentCheckoutProvider {
  readonly providerKey = "paddle";

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
        externalCheckoutId: `txn_test${input.purchaseId.replaceAll("-", "").slice(0, 22)}`,
        checkoutUrl: `https://checkout.test/${input.purchaseId}`,
        expiresAt: null
      };
    }

    if (process.env.PAYMENT_PROVIDER !== "paddle") {
      throw new ServiceUnavailableException(
        "A production payment provider is not configured."
      );
    }

    const apiKey = requireConfigured("PADDLE_API_KEY");
    const taxCategory = requireConfigured("PADDLE_TAX_CATEGORY");
    const paymentLinkBaseUrl = checkoutBaseUrl(input.purchaseId);
    const responseBody = {
      items: [
        {
          quantity: 1,
          price: {
            description: `Platform purchase ${input.purchaseId}`,
            billing_cycle: null,
            trial_period: null,
            tax_mode: "external",
            unit_price: {
              amount: String(input.amountMinor),
              currency_code: input.currency
            },
            quantity: {
              minimum: 1,
              maximum: 1
            },
            product: {
              name: input.productName,
              tax_category: taxCategory
            }
          }
        }
      ],
      collection_mode: "automatic",
      checkout: {
        url: paymentLinkBaseUrl
      },
      custom_data: {
        platform_purchase_id: input.purchaseId,
        platform_organization_id: input.organizationId
      }
    };

    let response: Response;
    try {
      response = await fetch(`${paddleBaseUrl()}/transactions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "Paddle-Version": paddleApiVersion
        },
        body: JSON.stringify(responseBody)
      });
    } catch {
      throw new ServiceUnavailableException(
        "Paddle Checkout is temporarily unavailable."
      );
    }

    if (!response.ok) {
      throw new ServiceUnavailableException(
        "Paddle rejected the transaction request."
      );
    }

    let decoded: unknown;
    try {
      decoded = await response.json();
    } catch {
      throw new ServiceUnavailableException(
        "Paddle returned an invalid transaction response."
      );
    }
    const transaction = requirePaddleTransactionResponse(
      decoded,
      paymentLinkBaseUrl
    );
    return {
      externalCheckoutId: transaction.id,
      checkoutUrl: transaction.url,
      expiresAt: null
    };
  }
}
