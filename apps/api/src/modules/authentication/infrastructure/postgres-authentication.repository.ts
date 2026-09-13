import { Injectable } from "@nestjs/common";
import type { DatabaseTransaction } from "@platform/database";

import {
  AuthenticationRepository,
  type NewAuthenticationSession
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
}
