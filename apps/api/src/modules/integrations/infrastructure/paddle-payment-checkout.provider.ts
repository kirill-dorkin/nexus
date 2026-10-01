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

function requirePaddleTransactionResponse(value: unknown): {
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
  return { id, url };
}

export class PaddlePaymentCheckoutProvider extends PaymentCheckoutProvider {
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
        providerKey: "paddle",
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
    const responseBody = {
      items: [
        {
          quantity: 1,
          price: {
            description: `Nexus purchase ${input.purchaseId}`,
            name: input.productName,
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
      custom_data: {
        nexus_purchase_id: input.purchaseId,
        nexus_organization_id: input.organizationId
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
    const transaction = requirePaddleTransactionResponse(decoded);
    return {
      providerKey: "paddle",
      externalCheckoutId: transaction.id,
      checkoutUrl: transaction.url,
      expiresAt: null
    };
  }
}
