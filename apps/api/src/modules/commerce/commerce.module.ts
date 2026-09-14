import { Module } from "@nestjs/common";

import { OutboxModule } from "../../outbox/outbox.module";
import { AuthorizationModule } from "../authorization/authorization.module";
import { IdentityModule } from "../identity/identity.module";
import { OrganizationsModule } from "../organizations/organizations.module";
import { CommerceRepository } from "./application/commerce.repository";
import { CommerceApplicationService } from "./application/commerce.service";
import { EntitlementQuery } from "./application/entitlement.query";
import { CommerceController } from "./commerce.controller";
import { PostgresCommerceRepository } from "./infrastructure/postgres-commerce.repository";

@Module({
  imports: [
    IdentityModule,
    OrganizationsModule,
    AuthorizationModule,
    OutboxModule
  ],
  controllers: [CommerceController],
  providers: [
    CommerceApplicationService,
    {
      provide: EntitlementQuery,
      useExisting: CommerceApplicationService
    },
    {
      provide: CommerceRepository,
      useClass: PostgresCommerceRepository
    }
  ],
  exports: [EntitlementQuery]
})
export class CommerceModule {}
