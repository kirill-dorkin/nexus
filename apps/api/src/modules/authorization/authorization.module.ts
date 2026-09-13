import { Module } from "@nestjs/common";

import { AuthorizationApplicationService } from "./application/authorization.service";
import { AuthorizationPolicy } from "./application/authorization.policy";
import { AuthorizationRepository } from "./application/authorization.repository";
import { PostgresAuthorizationRepository } from "./infrastructure/postgres-authorization.repository";

@Module({
  providers: [
    AuthorizationApplicationService,
    AuthorizationPolicy,
    {
      provide: AuthorizationRepository,
      useClass: PostgresAuthorizationRepository
    }
  ],
  exports: [AuthorizationApplicationService, AuthorizationPolicy]
})
export class AuthorizationModule {}
