import { Controller, Get, Header } from "@nestjs/common";
import type { IdentityUser } from "@platform/contracts";

import { CurrentIdentityApplicationService } from "./application/current-identity.service";

@Controller()
export class IdentityController {
  constructor(private readonly currentIdentity: CurrentIdentityApplicationService) {}

  @Get("me")
  @Header("Cache-Control", "no-store")
  getCurrentUser(): Promise<IdentityUser> {
    return this.currentIdentity.getCurrentUser();
  }
}
