import { Module } from "@nestjs/common";

import { OutboxModule } from "../../outbox/outbox.module";
import { AuthorizationModule } from "../authorization/authorization.module";
import { IdentityModule } from "../identity/identity.module";
import { OrganizationsModule } from "../organizations/organizations.module";
import { CheckoutCommerceOfferQuery } from "./application/checkout-commerce-offer.query";
import { CommerceRepository } from "./application/commerce.repository";
import { CommerceApplicationService } from "./application/commerce.service";
import { EntitlementQuery } from "./application/entitlement.query";
import { PublicCommerceCatalogQuery } from "./application/public-commerce-catalog.query";
import { PurchaseCommand } from "./application/purchase.command";
import { CommerceCatalogController } from "./commerce-catalog.controller";
import { CommerceController } from "./commerce.controller";
import { PostgresCheckoutCommerceOfferQuery } from "./infrastructure/postgres-checkout-commerce-offer.query";
import { PostgresCommerceRepository } from "./infrastructure/postgres-commerce.repository";
import { PostgresPublicCommerceCatalogQuery } from "./infrastructure/postgres-public-commerce-catalog.query";

@Module({
  imports: [
    IdentityModule,
    OrganizationsModule,
    AuthorizationModule,
    OutboxModule
  ],
  controllers: [CommerceController, CommerceCatalogController],
  providers: [
    CommerceApplicationService,
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
    }
  ],
  exports: [
    EntitlementQuery,
    PurchaseCommand,
    PublicCommerceCatalogQuery,
    CheckoutCommerceOfferQuery
  ]
})
export class CommerceModule {}
