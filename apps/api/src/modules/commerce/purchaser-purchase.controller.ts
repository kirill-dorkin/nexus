import { Controller, Get, Header, Param } from "@nestjs/common";
import {
  publicPurchaseSchema,
  uuidSchema,
  type PublicPurchase
} from "@platform/contracts";

import { parseRequest } from "../../http/validation";
import { PurchaserPurchaseApplicationService } from "./application/purchaser-purchase.service";

@Controller("me/purchases")
export class PurchaserPurchaseController {
  constructor(private readonly purchases: PurchaserPurchaseApplicationService) {}

  @Get(":purchaseId")
  @Header("Cache-Control", "no-store")
  async getOwnPurchase(
    @Param("purchaseId") purchaseId: string
  ): Promise<PublicPurchase> {
    return publicPurchaseSchema.parse(
      await this.purchases.getOwnPurchase(parseRequest(uuidSchema, purchaseId))
    );
  }
}
