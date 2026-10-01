import {
  BadRequestException,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
  Req
} from "@nestjs/common";

import { PaymentWebhookApplicationService } from "./application/payment-webhook.service";

type RawBodyRequest = Readonly<{
  rawBody?: Buffer;
}>;

@Controller("integrations/payments/stripe")
export class StripePaymentWebhookController {
  constructor(
    private readonly paymentWebhooks: PaymentWebhookApplicationService
  ) {}

  @Post("webhooks")
  @HttpCode(HttpStatus.ACCEPTED)
  async receive(
    @Req() request: RawBodyRequest,
    @Headers("stripe-signature") signature: string | undefined
  ): Promise<void> {
    if (request.rawBody === undefined) {
      throw new BadRequestException(
        "Raw Stripe webhook body is unavailable."
      );
    }
    await this.paymentWebhooks.receiveStripe(request.rawBody, signature);
  }
}
