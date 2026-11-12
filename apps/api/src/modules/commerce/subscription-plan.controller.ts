import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Param,
  Post
} from "@nestjs/common";
import {
  createSubscriptionPlanPriceRequestSchema,
  createSubscriptionPlanRequestSchema,
  uuidSchema,
  type SubscriptionPlan,
  type SubscriptionPlanPrice
} from "@platform/contracts";

import { parseRequest } from "../../http/validation";
import { SubscriptionApplicationService } from "./application/subscription.service";

/** ADR-0087: the operator's subscription plans and their immutable prices (`commerce.manage`). */
@Controller("organizations/:organizationId/subscription-plans")
export class SubscriptionPlanController {
  constructor(private readonly subscriptions: SubscriptionApplicationService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  createPlan(
    @Param("organizationId") organizationId: string,
    @Body() body: unknown
  ): Promise<SubscriptionPlan> {
    return this.subscriptions.createPlan(
      parseRequest(uuidSchema, organizationId),
      parseRequest(createSubscriptionPlanRequestSchema, body)
    );
  }

  @Post(":planId/archive")
  @HttpCode(HttpStatus.OK)
  archivePlan(
    @Param("organizationId") organizationId: string,
    @Param("planId") planId: string
  ): Promise<SubscriptionPlan> {
    return this.subscriptions.archivePlan(
      parseRequest(uuidSchema, organizationId),
      parseRequest(uuidSchema, planId)
    );
  }

  @Post(":planId/prices")
  @HttpCode(HttpStatus.CREATED)
  createPrice(
    @Param("organizationId") organizationId: string,
    @Param("planId") planId: string,
    @Body() body: unknown
  ): Promise<SubscriptionPlanPrice> {
    return this.subscriptions.createPlanPrice(
      parseRequest(uuidSchema, organizationId),
      parseRequest(uuidSchema, planId),
      parseRequest(createSubscriptionPlanPriceRequestSchema, body)
    );
  }

  @Post(":planId/prices/:priceId/archive")
  @HttpCode(HttpStatus.OK)
  archivePrice(
    @Param("organizationId") organizationId: string,
    @Param("priceId") priceId: string
  ): Promise<SubscriptionPlanPrice> {
    return this.subscriptions.archivePlanPrice(
      parseRequest(uuidSchema, organizationId),
      parseRequest(uuidSchema, priceId)
    );
  }
}
