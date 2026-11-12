import {
  Body,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Post
} from "@nestjs/common";

import { LavaWebhookApplicationService } from "./application/lava-webhook.service";

/** lava.top subscription webhooks (ADR-0087 §6), authenticated by the X-Api-Key secret. */
@Controller("integrations/payments/lava")
export class LavaWebhookController {
  constructor(private readonly webhooks: LavaWebhookApplicationService) {}

  @Post("webhooks")
  @HttpCode(HttpStatus.OK)
  async receive(
    @Headers("x-api-key") apiKey: string | undefined,
    @Body() body: unknown
  ): Promise<{ outcome: string }> {
    return { outcome: await this.webhooks.receive(apiKey, body) };
  }
}
