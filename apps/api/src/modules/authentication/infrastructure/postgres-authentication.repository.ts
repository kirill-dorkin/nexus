import { Injectable } from "@nestjs/common";
import type { DatabaseTransaction } from "@platform/database";
import type { OAuthProvider } from "@platform/contracts";

import {
  AuthenticationRepository,
  type NewAuthenticationSession,
  type NewOAuthLoginState,
  type OAuthLoginState
} from "../application/authentication.repository";

@Injectable()
export class PostgresAuthenticationRepository extends AuthenticationRepository {
  async findPasswordHash(
    transaction: DatabaseTransaction,
    userId: string
  ): Promise<string | null> {
    const result = await transaction.client.query<{ password_hash: string }>(
      `SELECT password_hash
         FROM identity.password_credentials
        WHERE user_id = $1`,
      [userId]
    );
    return result.rows[0]?.password_hash ?? null;
  }

  async createPasswordCredential(
    transaction: DatabaseTransaction,
    userId: string,
    passwordHash: string
  ): Promise<void> {
    await transaction.client.query(
      `INSERT INTO identity.password_credentials (user_id, password_hash)
       VALUES ($1, $2)`,
      [userId, passwordHash]
    );
  }

  async createSession(
    transaction: DatabaseTransaction,
    session: NewAuthenticationSession
  ): Promise<void> {
    await transaction.client.query(
      `INSERT INTO identity.sessions (user_id, token_hash, expires_at)
       VALUES ($1, $2, $3)`,
      [session.userId, session.tokenHash, session.expiresAt]
    );
  }

  async findActiveSessionUserId(
    transaction: DatabaseTransaction,
    tokenHash: string
  ): Promise<string | null> {
    const result = await transaction.client.query<{ user_id: string }>(
      `SELECT user_id::text
         FROM identity.sessions
        WHERE token_hash = $1
          AND revoked_at IS NULL
          AND expires_at > now()`,
      [tokenHash]
    );
    return result.rows[0]?.user_id ?? null;
  }

  async revokeSessionByTokenHash(
    transaction: DatabaseTransaction,
    tokenHash: string
  ): Promise<void> {
    await transaction.client.query(
      `UPDATE identity.sessions
          SET revoked_at = COALESCE(revoked_at, now())
        WHERE token_hash = $1`,
      [tokenHash]
    );
  }

  async createOAuthLoginState(
    transaction: DatabaseTransaction,
    state: NewOAuthLoginState
  ): Promise<void> {
    await transaction.client.query(
      `DELETE FROM identity.oauth_login_states WHERE expires_at <= now()`
    );
    await transaction.client.query(
      `INSERT INTO identity.oauth_login_states
         (state_hash, provider, code_verifier, return_to, expires_at)
       VALUES ($1, $2, $3, $4, $5)`,
      [state.stateHash, state.provider, state.codeVerifier, state.returnTo, state.expiresAt]
    );
  }

  async consumeOAuthLoginState(
    transaction: DatabaseTransaction,
    provider: OAuthProvider,
    stateHash: string
  ): Promise<OAuthLoginState | null> {
    const result = await transaction.client.query<{
      code_verifier: string;
      return_to: string;
    }>(
      `DELETE FROM identity.oauth_login_states
        WHERE state_hash = $1
          AND provider = $2
          AND expires_at > now()
      RETURNING code_verifier, return_to`,
      [stateHash, provider]
    );
    const row = result.rows[0];
    return row === undefined
      ? null
      : { codeVerifier: row.code_verifier, returnTo: row.return_to };
  }

  async findExternalIdentityUserId(
    transaction: DatabaseTransaction,
    provider: OAuthProvider,
    subject: string
  ): Promise<string | null> {
    const result = await transaction.client.query<{ user_id: string }>(
      `SELECT user_id::text
         FROM identity.external_identities
        WHERE provider = $1 AND subject = $2`,
      [provider, subject]
    );
    return result.rows[0]?.user_id ?? null;
  }

  async createExternalIdentity(
    transaction: DatabaseTransaction,
    provider: OAuthProvider,
    subject: string,
    userId: string
  ): Promise<void> {
    await transaction.client.query(
      `INSERT INTO identity.external_identities (provider, subject, user_id)
       VALUES ($1, $2, $3)`,
      [provider, subject, userId]
    );
  }

  async touchExternalIdentity(
    transaction: DatabaseTransaction,
    provider: OAuthProvider,
    subject: string
  ): Promise<void> {
    await transaction.client.query(
      `UPDATE identity.external_identities
          SET last_login_at = now()
        WHERE provider = $1 AND subject = $2`,
      [provider, subject]
    );
  }
}
