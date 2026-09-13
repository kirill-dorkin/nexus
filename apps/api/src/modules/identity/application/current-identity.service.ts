import { Injectable } from "@nestjs/common";
import type { IdentityUser } from "@platform/contracts";

import { DatabaseService } from "../../../database/database.service";
import { RequestContextService } from "../../../request-context/request-context.service";
import { IdentityApplicationService } from "./identity.service";

@Injectable()
export class CurrentIdentityApplicationService {
  constructor(
    private readonly database: DatabaseService,
    private readonly requestContext: RequestContextService,
    private readonly identity: IdentityApplicationService
  ) {}

  async getCurrentUser(): Promise<IdentityUser> {
    const userId = this.requestContext.requirePrincipal().userId;

    return this.database.transaction((transaction) =>
      this.identity.requireActiveUser(transaction, userId)
    );
  }
}
