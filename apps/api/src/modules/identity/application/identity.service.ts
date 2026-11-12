import {
  ConflictException,
  ForbiddenException,
  Injectable
} from "@nestjs/common";
import type { IdentityUser, LegalConsent } from "@platform/contracts";
import type { DatabaseTransaction } from "@platform/database";

import {
  IdentityRepository,
  type NewIdentityUser
} from "./identity.repository";
import { documentsWithoutCurrentConsent } from "../domain/legal-consent";

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

@Injectable()
export class IdentityApplicationService {
  constructor(private readonly users: IdentityRepository) {}

  /** When the account was created (ISO 8601); null for an unknown user. */
  accountCreatedAt(
    transaction: DatabaseTransaction,
    userId: string
  ): Promise<string | null> {
    return this.users.findCreatedAt(transaction, userId);
  }

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

  /** Records the registration consents; any document without its current version rejects. */
  async recordRegistrationConsents(
    transaction: DatabaseTransaction,
    userId: string,
    consents: readonly LegalConsent[]
  ): Promise<void> {
    const missing = documentsWithoutCurrentConsent(consents);
    if (missing.length > 0) {
      throw new ConflictException({
        message:
          "Registration requires consent to the current legal documents.",
        code: "legal_consent_required",
        documents: missing
      });
    }
    await this.users.recordLegalConsents(transaction, userId, consents);
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
      throw new ForbiddenException(
        "An active user is required for this operation."
      );
    }

    return user;
  }
}
