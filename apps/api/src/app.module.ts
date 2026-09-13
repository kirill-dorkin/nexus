import { Module } from "@nestjs/common";

import { DatabaseModule } from "./database/database.module";
import { HealthController } from "./health.controller";
import { AuthenticationModule } from "./modules/authentication/authentication.module";
import { AuthorizationModule } from "./modules/authorization/authorization.module";
import { IdentityModule } from "./modules/identity/identity.module";
import { OrganizationsModule } from "./modules/organizations/organizations.module";
import { RequestContextModule } from "./request-context/request-context.module";

@Module({
  imports: [
    DatabaseModule,
    RequestContextModule,
    IdentityModule,
    AuthenticationModule,
    AuthorizationModule,
    OrganizationsModule
  ],
  controllers: [HealthController]
})
export class AppModule {}
