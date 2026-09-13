import { Module } from "@nestjs/common";

import { OutboxModule } from "../../outbox/outbox.module";
import { AuthorizationModule } from "../authorization/authorization.module";
import { IdentityModule } from "../identity/identity.module";
import { OrganizationsApplicationService } from "./application/organizations.service";
import { OrganizationsRepository } from "./application/organizations.repository";
import { PostgresOrganizationsRepository } from "./infrastructure/postgres-organizations.repository";

@Module({
  imports: [IdentityModule, AuthorizationModule, OutboxModule],
  providers: [
    OrganizationsApplicationService,
    {
      provide: OrganizationsRepository,
      useClass: PostgresOrganizationsRepository
    }
  ],
  exports: [OrganizationsApplicationService]
})
export class OrganizationsModule {}
