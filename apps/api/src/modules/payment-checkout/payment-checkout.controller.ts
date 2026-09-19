import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Param,
  Post
} from "@nestjs/common";
import {
  createPurchaseCheckoutRequestSchema,
  purchaseCheckoutSchema,
  uuidSchema,
  type PurchaseCheckout
} from "@platform/contracts";

import { parseRequest } from "../../http/validation";
import { PurchaseCheckoutApplicationService } from "./payment-checkout.service";

@Controller("organizations/:organizationId/commerce/purchases")
export class PurchaseCheckoutController {
  constructor(
    private readonly checkout: PurchaseCheckoutApplicationService
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Param("organizationId") organizationId: string,
    @Body() body: unknown
  ): Promise<PurchaseCheckout> {
    return purchaseCheckoutSchema.parse(
      await this.checkout.createOrGetCheckout(
        parseRequest(uuidSchema, organizationId),
        parseRequest(createPurchaseCheckoutRequestSchema, body)
      )
    );
  }
}
