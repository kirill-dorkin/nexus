import { Module } from "@nestjs/common";

import { BrowserWriteOriginGuard } from "../../http/browser-write-origin.guard";
import { CommerceModule } from "../commerce/commerce.module";
import { IdentityModule } from "../identity/identity.module";
import { IntegrationsModule } from "../integrations/integrations.module";
import { OrganizationsModule } from "../organizations/organizations.module";
import { SubscriptionCheckoutController } from "./subscription-checkout.controller";
import { SubscriptionCheckoutService } from "./subscription-checkout.service";

/** ADR-0087: subscription checkout across Commerce and Integrations. */
@Module({
  imports: [
    CommerceModule,
    IntegrationsModule,
    IdentityModule,
    OrganizationsModule
  ],
  controllers: [SubscriptionCheckoutController],
  providers: [SubscriptionCheckoutService, BrowserWriteOriginGuard]
})
export class SubscriptionCheckoutModule {}
