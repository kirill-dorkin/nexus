import { Module } from "@nestjs/common";

import { OutboxModule } from "../../outbox/outbox.module";
import { AuthorizationModule } from "../authorization/authorization.module";
import { IdentityModule } from "../identity/identity.module";
import { OrganizationsModule } from "../organizations/organizations.module";
import { CheckoutCommerceOfferQuery } from "./application/checkout-commerce-offer.query";
import { CommerceRepository } from "./application/commerce.repository";
import { CommerceApplicationService } from "./application/commerce.service";
import { EntitlementQuery } from "./application/entitlement.query";
import { OwnedPurchaseOrganizationQuery } from "./application/owned-purchase-organization.query";
import { PublicCommerceCatalogQuery } from "./application/public-commerce-catalog.query";
import { PurchaseCommand } from "./application/purchase.command";
import { PurchaserPurchaseApplicationService } from "./application/purchaser-purchase.service";
import { CommerceCatalogController } from "./commerce-catalog.controller";
import { CommerceController } from "./commerce.controller";
import { PostgresCheckoutCommerceOfferQuery } from "./infrastructure/postgres-checkout-commerce-offer.query";
import { PostgresCommerceRepository } from "./infrastructure/postgres-commerce.repository";
import { PostgresOwnedPurchaseOrganizationQuery } from "./infrastructure/postgres-owned-purchase-organization.query";
import { PostgresPublicCommerceCatalogQuery } from "./infrastructure/postgres-public-commerce-catalog.query";
import { PurchaserPurchaseController } from "./purchaser-purchase.controller";
import { CatalogAccessQuery } from "./application/catalog-access.query";
import { SubscriptionCheckoutCommand } from "./application/subscription-checkout.command";
import { SubscriptionRepository } from "./application/subscription.repository";
import { SubscriptionApplicationService } from "./application/subscription.service";
import { PostgresSubscriptionRepository } from "./infrastructure/postgres-subscription.repository";
import { OwnCatalogAccessController } from "./own-catalog-access.controller";
import { SubscriptionPlanController } from "./subscription-plan.controller";

@Module({
  imports: [
    IdentityModule,
    OrganizationsModule,
    AuthorizationModule,
    OutboxModule
  ],
  controllers: [
    CommerceController,
    CommerceCatalogController,
    PurchaserPurchaseController,
    SubscriptionPlanController,
    OwnCatalogAccessController
  ],
  providers: [
    CommerceApplicationService,
    PurchaserPurchaseApplicationService,
    SubscriptionApplicationService,
    {
      provide: CatalogAccessQuery,
      useExisting: SubscriptionApplicationService
    },
    {
      provide: SubscriptionCheckoutCommand,
      useExisting: SubscriptionApplicationService
    },
    {
      provide: SubscriptionRepository,
      useClass: PostgresSubscriptionRepository
    },
    {
      provide: EntitlementQuery,
      useExisting: CommerceApplicationService
    },
    {
      provide: PurchaseCommand,
      useExisting: CommerceApplicationService
    },
    {
      provide: CommerceRepository,
      useClass: PostgresCommerceRepository
    },
    {
      provide: PublicCommerceCatalogQuery,
      useClass: PostgresPublicCommerceCatalogQuery
    },
    {
      provide: CheckoutCommerceOfferQuery,
      useClass: PostgresCheckoutCommerceOfferQuery
    },
    {
      provide: OwnedPurchaseOrganizationQuery,
      useClass: PostgresOwnedPurchaseOrganizationQuery
    }
  ],
  exports: [
    EntitlementQuery,
    CatalogAccessQuery,
    SubscriptionCheckoutCommand,
    PurchaseCommand,
    PublicCommerceCatalogQuery,
    CheckoutCommerceOfferQuery
  ]
})
export class CommerceModule {}
