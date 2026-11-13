import {
  Body,
  Controller,
  Get,
  Header,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards
} from "@nestjs/common";
import {
  organizationSlugSchema,
  startSubscriptionCheckoutRequestSchema,
  type OwnSubscription,
  type PublicSubscriptionOffers,
  type SubscriptionCheckout
} from "@platform/contracts";

import { BrowserWriteOriginGuard } from "../../http/browser-write-origin.guard";
import { parseRequest } from "../../http/validation";
import { SubscriptionCheckoutService } from "./subscription-checkout.service";

@Controller()
export class SubscriptionCheckoutController {
  constructor(private readonly checkout: SubscriptionCheckoutService) {}

  @Get("public/organizations/:organizationSlug/subscription-offers")
  offers(
    @Param("organizationSlug") organizationSlug: string
  ): Promise<PublicSubscriptionOffers> {
    return this.checkout.publicOffers(
      parseRequest(organizationSlugSchema, organizationSlug)
    );
  }

  @Get("me/subscriptions/:organizationSlug")
  @Header("Cache-Control", "no-store")
  own(
    @Param("organizationSlug") organizationSlug: string
  ): Promise<OwnSubscription> {
    return this.checkout.own(
      parseRequest(organizationSlugSchema, organizationSlug)
    );
  }

  @Post("me/subscriptions/:organizationSlug/checkout")
  @UseGuards(BrowserWriteOriginGuard)
  @HttpCode(HttpStatus.OK)
  start(
    @Param("organizationSlug") organizationSlug: string,
    @Body() body: unknown
  ): Promise<SubscriptionCheckout> {
    return this.checkout.checkout(
      parseRequest(organizationSlugSchema, organizationSlug),
      parseRequest(startSubscriptionCheckoutRequestSchema, body)
    );
  }

  @Post("me/subscriptions/:organizationSlug/cancel")
  @UseGuards(BrowserWriteOriginGuard)
  @HttpCode(HttpStatus.OK)
  cancel(
    @Param("organizationSlug") organizationSlug: string
  ): Promise<OwnSubscription> {
    return this.checkout.cancel(
      parseRequest(organizationSlugSchema, organizationSlug)
    );
  }
}
