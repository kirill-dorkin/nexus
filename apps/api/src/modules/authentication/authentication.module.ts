import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";

import { IdentityModule } from "../identity/identity.module";
import { AuthenticationApplicationService } from "./application/authentication.service";
import { AuthenticationRepository } from "./application/authentication.repository";
import { AuthenticationController } from "./authentication.controller";
import { SessionAuthenticationGuard } from "./http/session-authentication.guard";
import { PostgresAuthenticationRepository } from "./infrastructure/postgres-authentication.repository";

@Module({
  imports: [IdentityModule],
  controllers: [AuthenticationController],
  providers: [
    AuthenticationApplicationService,
    {
      provide: AuthenticationRepository,
      useClass: PostgresAuthenticationRepository
    },
    {
      provide: APP_GUARD,
      useClass: SessionAuthenticationGuard
    }
  ]
})
export class AuthenticationModule {}
