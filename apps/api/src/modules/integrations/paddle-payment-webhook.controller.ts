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

@Controller("integrations/payments/paddle")
export class PaddlePaymentWebhookController {
  constructor(
    private readonly paymentWebhooks: PaymentWebhookApplicationService
  ) {}

  @Post("webhooks")
  @HttpCode(HttpStatus.OK)
  async receive(
    @Req() request: RawBodyRequest,
    @Headers("paddle-signature") signature: string | undefined
  ): Promise<void> {
    if (request.rawBody === undefined) {
      throw new BadRequestException(
        "Raw Paddle webhook body is unavailable."
      );
    }
    await this.paymentWebhooks.receive(request.rawBody, signature);
  }
}
