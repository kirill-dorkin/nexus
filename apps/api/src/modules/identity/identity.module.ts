import { Module } from "@nestjs/common";

import { CurrentIdentityApplicationService } from "./application/current-identity.service";
import { IdentityRepository } from "./application/identity.repository";
import { IdentityApplicationService } from "./application/identity.service";
import { IdentityController } from "./identity.controller";
import { PostgresIdentityRepository } from "./infrastructure/postgres-identity.repository";

@Module({
  controllers: [IdentityController],
  providers: [
    CurrentIdentityApplicationService,
    IdentityApplicationService,
    {
      provide: IdentityRepository,
      useClass: PostgresIdentityRepository
    }
  ],
  exports: [IdentityApplicationService]
})
export class IdentityModule {}
