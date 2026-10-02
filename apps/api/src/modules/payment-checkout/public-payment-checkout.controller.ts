import {
  Body,
  Controller,
  Header,
  Param,
  Post,
  UseGuards
} from "@nestjs/common";
import {
  createPurchaseCheckoutRequestSchema,
  organizationSlugSchema,
  purchaseCheckoutSchema,
  resourceSlugSchema,
  type PurchaseCheckout
} from "@platform/contracts";

import { BrowserWriteOriginGuard } from "../../http/browser-write-origin.guard";
import { parseRequest } from "../../http/validation";
import { PurchaseCheckoutApplicationService } from "./payment-checkout.service";

@Controller("public/catalog/:organizationSlug/products/:productSlug")
@UseGuards(BrowserWriteOriginGuard)
export class PublicPurchaseCheckoutController {
  constructor(private readonly checkout: PurchaseCheckoutApplicationService) {}

  @Post("checkout")
  @Header("Cache-Control", "no-store")
  async createOrGetCheckout(
    @Param("organizationSlug") organizationSlug: string,
    @Param("productSlug") productSlug: string,
    @Body() body: unknown
  ): Promise<PurchaseCheckout> {
    return purchaseCheckoutSchema.parse(
      await this.checkout.createOrGetPublicCheckout(
        parseRequest(organizationSlugSchema, organizationSlug),
        parseRequest(resourceSlugSchema, productSlug),
        parseRequest(createPurchaseCheckoutRequestSchema, body)
      )
    );
  }
}
