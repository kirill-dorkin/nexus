import { Module } from "@nestjs/common";

import { IdentityApplicationService } from "./application/identity.service";
import { IdentityRepository } from "./application/identity.repository";
import { PostgresIdentityRepository } from "./infrastructure/postgres-identity.repository";

@Module({
  providers: [
    IdentityApplicationService,
    {
      provide: IdentityRepository,
      useClass: PostgresIdentityRepository
    }
  ],
  exports: [IdentityApplicationService]
})
export class IdentityModule {}
