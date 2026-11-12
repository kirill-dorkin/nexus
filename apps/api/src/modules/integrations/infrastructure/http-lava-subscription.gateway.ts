import {
  BadGatewayException,
  Injectable,
  ServiceUnavailableException
} from "@nestjs/common";

import { requireLavaSetting } from "../application/lava-config";
import {
  LavaSubscriptionGateway,
  type LavaInvoiceInput
} from "../application/lava-subscription.gateway";

const PERIODICITY = {
  month: "MONTHLY",
  days_90: "PERIOD_90_DAYS",
  year: "PERIOD_YEAR"
} as const;

/** `LAVA_API_BASE_URL` exists for integration tests; production uses the public gateway. */
const baseUrl = () =>
  process.env.LAVA_API_BASE_URL?.trim() || "https://gate.lava.top";

@Injectable()
export class HttpLavaSubscriptionGateway extends LavaSubscriptionGateway {
  async createInvoice(input: LavaInvoiceInput) {
    const response = await this.call("/api/v3/invoice", {
      method: "POST",
      body: JSON.stringify({
        email: input.email,
        offerId: input.offerId,
        currency: input.currency,
        periodicity: PERIODICITY[input.billingPeriod],
        buyerLanguage: "RU",
        ...(input.utm
          ? {
              clientUtm: {
                utm_source: input.utm.source ?? null,
                utm_medium: input.utm.medium ?? null,
                utm_campaign: input.utm.campaign ?? null
              }
            }
          : {}),
        successful_return_url: input.returnUrl,
        failure_return_url: input.returnUrl,
        cancel_return_url: input.returnUrl
      })
    });
    const body: unknown = await response.json().catch(() => null);
    const contract =
      typeof body === "object" && body !== null
        ? (body as Record<string, unknown>)
        : {};
    const contractId = contract.id;
    const paymentUrl = contract.paymentUrl;
    if (
      !response.ok ||
      typeof contractId !== "string" ||
      typeof paymentUrl !== "string" ||
      !paymentUrl.startsWith("https://")
    )
      throw new BadGatewayException(
        "The payment provider did not create the payment."
      );
    return { contractId, paymentUrl };
  }

  async cancelSubscription(input: { parentContractId: string; email: string }) {
    const query = new URLSearchParams({
      contractId: input.parentContractId,
      email: input.email
    });
    const response = await this.call(`/api/v1/subscriptions?${query}`, {
      method: "DELETE"
    });
    if (response.status !== 204 && response.status !== 404)
      throw new BadGatewayException(
        "The payment provider did not cancel the subscription."
      );
  }

  private async call(path: string, init: RequestInit): Promise<Response> {
    try {
      return await fetch(`${baseUrl()}${path}`, {
        ...init,
        headers: {
          "content-type": "application/json",
          accept: "application/json",
          "X-Api-Key": requireLavaSetting("LAVA_API_KEY")
        },
        signal: AbortSignal.timeout(15_000)
      });
    } catch (error) {
      if (error instanceof ServiceUnavailableException) throw error;
      throw new BadGatewayException("The payment provider is unreachable.");
    }
  }
}
