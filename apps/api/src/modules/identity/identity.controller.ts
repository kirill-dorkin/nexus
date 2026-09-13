import { Controller, Get } from "@nestjs/common";
import type { IdentityUser } from "@platform/contracts";

import { CurrentIdentityApplicationService } from "./application/current-identity.service";

@Controller()
export class IdentityController {
  constructor(private readonly currentIdentity: CurrentIdentityApplicationService) {}

  @Get("me")
  getCurrentUser(): Promise<IdentityUser> {
    return this.currentIdentity.getCurrentUser();
  }
}
