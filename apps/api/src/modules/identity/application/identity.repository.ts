import type { IdentityUser, LegalConsent } from "@platform/contracts";
import type { DatabaseTransaction } from "@platform/database";

export type NewIdentityUser = Readonly<{
  id: string;
  email: string;
  displayName: string | null;
}>;

export abstract class IdentityRepository {
  abstract findById(
    transaction: DatabaseTransaction,
    userId: string,
    lock?: boolean
  ): Promise<IdentityUser | null>;

  /** When the account was created (ISO 8601), e.g. for the trial of ADR-0087. */
  abstract findCreatedAt(
    transaction: DatabaseTransaction,
    userId: string
  ): Promise<string | null>;

  abstract findByNormalizedEmail(
    transaction: DatabaseTransaction,
    normalizedEmail: string
  ): Promise<IdentityUser | null>;

  abstract createUser(
    transaction: DatabaseTransaction,
    user: NewIdentityUser
  ): Promise<IdentityUser>;

  abstract recordLegalConsents(
    transaction: DatabaseTransaction,
    userId: string,
    consents: readonly LegalConsent[]
  ): Promise<void>;
}
