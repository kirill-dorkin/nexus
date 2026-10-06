import { ForbiddenException, Injectable } from "@nestjs/common";
import type { IdentityUser } from "@platform/contracts";
import type { DatabaseTransaction } from "@platform/database";

import {
  IdentityRepository,
  type NewIdentityUser
} from "./identity.repository";

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

@Injectable()
export class IdentityApplicationService {
  constructor(private readonly users: IdentityRepository) {}

  findByEmail(
    transaction: DatabaseTransaction,
    email: string
  ): Promise<IdentityUser | null> {
    return this.users.findByNormalizedEmail(transaction, normalizeEmail(email));
  }

  createUser(
    transaction: DatabaseTransaction,
    user: NewIdentityUser
  ): Promise<IdentityUser> {
    return this.users.createUser(transaction, {
      ...user,
      email: normalizeEmail(user.email)
    });
  }

  async findActiveUser(
    transaction: DatabaseTransaction,
    userId: string
  ): Promise<IdentityUser | null> {
    const user = await this.users.findById(transaction, userId);
    return user?.status === "active" ? user : null;
  }

  async requireActiveUser(
    transaction: DatabaseTransaction,
    userId: string,
    lock = false
  ): Promise<IdentityUser> {
    const candidate = await this.users.findById(transaction, userId, lock);
    const user = candidate?.status === "active" ? candidate : null;

    if (user === null) {
      throw new ForbiddenException("An active user is required for this operation.");
    }

    return user;
  }
}
