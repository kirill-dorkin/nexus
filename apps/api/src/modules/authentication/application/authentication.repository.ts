import type { DatabaseTransaction } from "@platform/database";

export type NewAuthenticationSession = Readonly<{
  userId: string;
  tokenHash: string;
  expiresAt: Date;
}>;

export abstract class AuthenticationRepository {
  abstract findPasswordHash(
    transaction: DatabaseTransaction,
    userId: string
  ): Promise<string | null>;

  abstract createPasswordCredential(
    transaction: DatabaseTransaction,
    userId: string,
    passwordHash: string
  ): Promise<void>;

  abstract createSession(
    transaction: DatabaseTransaction,
    session: NewAuthenticationSession
  ): Promise<void>;

  abstract findActiveSessionUserId(
    transaction: DatabaseTransaction,
    tokenHash: string
  ): Promise<string | null>;

  abstract revokeSessionByTokenHash(
    transaction: DatabaseTransaction,
    tokenHash: string
  ): Promise<void>;
}
