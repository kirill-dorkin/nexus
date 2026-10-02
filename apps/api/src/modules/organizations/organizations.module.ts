import { Module } from "@nestjs/common";

import { BrowserWriteOriginGuard } from "../../http/browser-write-origin.guard";
import { OutboxModule } from "../../outbox/outbox.module";
import { AuthorizationModule } from "../authorization/authorization.module";
import { IdentityModule } from "../identity/identity.module";
import { CheckoutOrganizationQuery } from "./application/checkout-organization.query";
import { OrganizationsRepository } from "./application/organizations.repository";
import { OrganizationsApplicationService } from "./application/organizations.service";
import { PublicOrganizationQuery } from "./application/public-organization.query";
import { PostgresCheckoutOrganizationQuery } from "./infrastructure/postgres-checkout-organization.query";
import { PostgresOrganizationsRepository } from "./infrastructure/postgres-organizations.repository";
import { PostgresPublicOrganizationQuery } from "./infrastructure/postgres-public-organization.query";
import { OrganizationsController } from "./organizations.controller";
import { PublicOrganizationEntryController } from "./public-organization-entry.controller";

@Module({
  imports: [IdentityModule, AuthorizationModule, OutboxModule],
  controllers: [OrganizationsController, PublicOrganizationEntryController],
  providers: [
    OrganizationsApplicationService,
    BrowserWriteOriginGuard,
    {
      provide: OrganizationsRepository,
      useClass: PostgresOrganizationsRepository
    },
    {
      provide: PublicOrganizationQuery,
      useClass: PostgresPublicOrganizationQuery
    },
    {
      provide: CheckoutOrganizationQuery,
      useClass: PostgresCheckoutOrganizationQuery
    }
  ],
  exports: [
    OrganizationsApplicationService,
    PublicOrganizationQuery,
    CheckoutOrganizationQuery
  ]
})
export class OrganizationsModule {}
