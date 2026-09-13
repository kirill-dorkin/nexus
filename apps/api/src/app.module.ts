import { Module } from "@nestjs/common";

import { HealthController } from "./health.controller";
import { AuthorizationModule } from "./modules/authorization/authorization.module";
import { RequestContextModule } from "./request-context/request-context.module";

@Module({
  imports: [RequestContextModule, AuthorizationModule],
  controllers: [HealthController]
})
export class AppModule {}
