import { ForbiddenException, Injectable } from "@nestjs/common";
import type { IdentityUser } from "@platform/contracts";
import type { DatabaseTransaction } from "@platform/database";

import { IdentityRepository } from "./identity.repository";

@Injectable()
export class IdentityApplicationService {
  constructor(private readonly users: IdentityRepository) {}

  async requireActiveUser(
    transaction: DatabaseTransaction,
    userId: string
  ): Promise<IdentityUser> {
    const user = await this.users.findById(transaction, userId);

    if (user === null || user.status !== "active") {
      throw new ForbiddenException("An active user is required for this operation.");
    }

    return user;
  }
}
