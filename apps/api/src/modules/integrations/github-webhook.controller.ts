import {
  BadRequestException,
  Body,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
  Req
} from "@nestjs/common";

import { GitHubWebhookApplicationService } from "./application/github-webhook.service";

type RawBodyRequest = Readonly<{
  rawBody?: Buffer;
}>;

@Controller("integrations/github")
export class GitHubWebhookController {
  constructor(
    private readonly githubWebhooks: GitHubWebhookApplicationService
  ) {}

  @Post("webhooks")
  @HttpCode(HttpStatus.ACCEPTED)
  async receive(
    @Req() request: RawBodyRequest,
    @Headers("x-hub-signature-256") signature: string | undefined,
    @Headers("x-github-delivery") deliveryId: string | undefined,
    @Headers("x-github-event") eventName: string | undefined,
    @Body() payload: unknown
  ): Promise<void> {
    if (request.rawBody === undefined) {
      throw new BadRequestException("Raw GitHub webhook body is unavailable.");
    }

    await this.githubWebhooks.receive({
      rawBody: request.rawBody,
      signature,
      deliveryId,
      eventName,
      payload
    });
  }
}
