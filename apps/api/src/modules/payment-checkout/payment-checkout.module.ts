import { Module } from "@nestjs/common";

import { BrowserWriteOriginGuard } from "../../http/browser-write-origin.guard";
import { CommerceModule } from "../commerce/commerce.module";
import { IntegrationsModule } from "../integrations/integrations.module";
import { LearningDeliveryModule } from "../learning-delivery/learning-delivery.module";
import { OrganizationsModule } from "../organizations/organizations.module";
import { PurchaseCheckoutController } from "./payment-checkout.controller";
import { PurchaseCheckoutApplicationService } from "./payment-checkout.service";
import { PublicPurchaseCheckoutController } from "./public-payment-checkout.controller";

@Module({
  imports: [
    CommerceModule,
    IntegrationsModule,
    LearningDeliveryModule,
    OrganizationsModule
  ],
  controllers: [PurchaseCheckoutController, PublicPurchaseCheckoutController],
  providers: [PurchaseCheckoutApplicationService, BrowserWriteOriginGuard]
})
export class PaymentCheckoutModule {}
