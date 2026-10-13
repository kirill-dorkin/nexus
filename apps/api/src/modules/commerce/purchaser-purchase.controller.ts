import { Controller, Get, Header, HttpStatus, Param } from "@nestjs/common";
import {
  publicPurchaseSchema,
  uuidSchema,
  type PublicPurchase
} from "@platform/contracts";

import { parseRequest } from "../../http/validation";
import {
  observePublicLaunchHttp,
  recordPublicLaunchReconciliation
} from "../../observability/public-launch-operational-events";
import { PurchaserPurchaseApplicationService } from "./application/purchaser-purchase.service";

@Controller("me/purchases")
export class PurchaserPurchaseController {
  constructor(private readonly purchases: PurchaserPurchaseApplicationService) {}

  @Get(":purchaseId")
  @Header("Cache-Control", "no-store")
  async getOwnPurchase(
    @Param("purchaseId") purchaseId: string
  ): Promise<PublicPurchase> {
    return observePublicLaunchHttp(
      "purchaser_reconciliation",
      HttpStatus.OK,
      async () => {
        const purchase = publicPurchaseSchema.parse(
          await this.purchases.getOwnPurchase(
            parseRequest(uuidSchema, purchaseId)
          )
        );
        recordPublicLaunchReconciliation(
          purchase.status,
          purchase.createdAt,
          purchase.paidAt
        );
        return purchase;
      }
    );
  }
}
