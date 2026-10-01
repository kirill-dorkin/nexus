import { Module } from "@nestjs/common";

import { CommerceModule } from "../commerce/commerce.module";
import { IntegrationsModule } from "../integrations/integrations.module";
import { PurchaseCheckoutController } from "./payment-checkout.controller";
import { PurchaseCheckoutApplicationService } from "./payment-checkout.service";

@Module({
  imports: [CommerceModule, IntegrationsModule],
  controllers: [PurchaseCheckoutController],
  providers: [PurchaseCheckoutApplicationService]
})
export class PaymentCheckoutModule {}
