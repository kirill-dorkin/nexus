import type { DatabaseTransaction } from "@platform/database";
import type { OAuthProvider } from "@platform/contracts";

export type NewAuthenticationSession = Readonly<{
  userId: string;
  tokenHash: string;
  expiresAt: Date;
}>;

export type NewOAuthLoginState = Readonly<{
  stateHash: string;
  provider: OAuthProvider;
  codeVerifier: string;
  returnTo: string;
  expiresAt: Date;
}>;

export type NewPasswordResetToken = Readonly<{
  userId: string;
  tokenHash: string;
  expiresAt: Date;
}>;

export type OAuthLoginState = Readonly<{
  codeVerifier: string;
  returnTo: string;
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

  abstract createOAuthLoginState(
    transaction: DatabaseTransaction,
    state: NewOAuthLoginState
  ): Promise<void>;

  abstract consumeOAuthLoginState(
    transaction: DatabaseTransaction,
    provider: OAuthProvider,
    stateHash: string
  ): Promise<OAuthLoginState | null>;

  abstract findExternalIdentityUserId(
    transaction: DatabaseTransaction,
    provider: OAuthProvider,
    subject: string
  ): Promise<string | null>;

  abstract createExternalIdentity(
    transaction: DatabaseTransaction,
    provider: OAuthProvider,
    subject: string,
    userId: string
  ): Promise<void>;

  abstract touchExternalIdentity(
    transaction: DatabaseTransaction,
    provider: OAuthProvider,
    subject: string
  ): Promise<void>;

  /** Supersedes the user's open tokens and stores a new one (ADR-0082). */
  abstract createPasswordResetToken(
    transaction: DatabaseTransaction,
    token: NewPasswordResetToken
  ): Promise<void>;

  /** Marks an open, unexpired token used and returns its user, or null. */
  abstract consumePasswordResetToken(
    transaction: DatabaseTransaction,
    tokenHash: string
  ): Promise<string | null>;

  /** Sets the password, creating the credential for an external-only account. */
  abstract setPasswordHash(
    transaction: DatabaseTransaction,
    userId: string,
    passwordHash: string
  ): Promise<void>;

  abstract revokeUserSessions(
    transaction: DatabaseTransaction,
    userId: string
  ): Promise<void>;
}
