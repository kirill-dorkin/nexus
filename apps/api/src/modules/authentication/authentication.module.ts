import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";

import { IdentityModule } from "../identity/identity.module";
import { AuthenticationApplicationService } from "./application/authentication.service";
import { AuthenticationRepository } from "./application/authentication.repository";
import { OAuthLoginService } from "./application/oauth-login.service";
import { OAuthProviderGateway } from "./application/oauth-provider.gateway";
import { AuthenticationController } from "./authentication.controller";
import { SessionAuthenticationGuard } from "./http/session-authentication.guard";
import { PostgresAuthenticationRepository } from "./infrastructure/postgres-authentication.repository";
import { HttpOAuthProviderGateway } from "./infrastructure/http-oauth-provider.gateway";

@Module({
  imports: [IdentityModule],
  controllers: [AuthenticationController],
  providers: [
    AuthenticationApplicationService,
    OAuthLoginService,
    {
      provide: AuthenticationRepository,
      useClass: PostgresAuthenticationRepository
    },
    {
      provide: OAuthProviderGateway,
      useClass: HttpOAuthProviderGateway
    },
    {
      provide: APP_GUARD,
      useClass: SessionAuthenticationGuard
    }
  ]
})
export class AuthenticationModule {}
