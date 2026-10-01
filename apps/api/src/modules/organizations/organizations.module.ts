import { Module } from "@nestjs/common";

import { OutboxModule } from "../../outbox/outbox.module";
import { AuthorizationModule } from "../authorization/authorization.module";
import { IdentityModule } from "../identity/identity.module";
import { OrganizationsRepository } from "./application/organizations.repository";
import { OrganizationsApplicationService } from "./application/organizations.service";
import { PublicOrganizationQuery } from "./application/public-organization.query";
import { PostgresOrganizationsRepository } from "./infrastructure/postgres-organizations.repository";
import { PostgresPublicOrganizationQuery } from "./infrastructure/postgres-public-organization.query";
import { OrganizationsController } from "./organizations.controller";

@Module({
  imports: [IdentityModule, AuthorizationModule, OutboxModule],
  controllers: [OrganizationsController],
  providers: [
    OrganizationsApplicationService,
    {
      provide: OrganizationsRepository,
      useClass: PostgresOrganizationsRepository
    },
    {
      provide: PublicOrganizationQuery,
      useClass: PostgresPublicOrganizationQuery
    }
  ],
  exports: [OrganizationsApplicationService, PublicOrganizationQuery]
})
export class OrganizationsModule {}
