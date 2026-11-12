import { Injectable } from "@nestjs/common";
import type { IdentityUser, LegalConsent } from "@platform/contracts";
import type { DatabaseTransaction } from "@platform/database";

import {
  IdentityRepository,
  type NewIdentityUser
} from "../application/identity.repository";

type IdentityUserRow = {
  id: string;
  email: string;
  display_name: string | null;
  status: IdentityUser["status"];
};

function mapIdentityUser(row: IdentityUserRow): IdentityUser {
  return {
    id: row.id,
    email: row.email,
    displayName: row.display_name,
    status: row.status
  };
}

@Injectable()
export class PostgresIdentityRepository extends IdentityRepository {
  async findById(
    transaction: DatabaseTransaction,
    userId: string,
    lock = false
  ): Promise<IdentityUser | null> {
    const result = await transaction.client.query<IdentityUserRow>(
      `SELECT id::text, email, display_name, status
         FROM identity.users
        WHERE id = $1 ${lock ? "FOR SHARE" : ""}`,
      [userId]
    );
    const row = result.rows[0];
    return row === undefined ? null : mapIdentityUser(row);
  }

  async findCreatedAt(
    transaction: DatabaseTransaction,
    userId: string
  ): Promise<string | null> {
    const result = await transaction.client.query<{ created_at: Date }>(
      "SELECT created_at FROM identity.users WHERE id = $1",
      [userId]
    );
    return result.rows[0]?.created_at.toISOString() ?? null;
  }

  async findByNormalizedEmail(
    transaction: DatabaseTransaction,
    normalizedEmail: string
  ): Promise<IdentityUser | null> {
    const result = await transaction.client.query<IdentityUserRow>(
      `SELECT id::text, email, display_name, status
         FROM identity.users
        WHERE lower(btrim(email)) = $1`,
      [normalizedEmail]
    );
    const row = result.rows[0];
    return row === undefined ? null : mapIdentityUser(row);
  }

  async createUser(
    transaction: DatabaseTransaction,
    user: NewIdentityUser
  ): Promise<IdentityUser> {
    const result = await transaction.client.query<IdentityUserRow>(
      `INSERT INTO identity.users (id, email, display_name)
       VALUES ($1, $2, $3)
       RETURNING id::text, email, display_name, status`,
      [user.id, user.email, user.displayName]
    );
    const row = result.rows[0];

    if (row === undefined) {
      throw new Error("PostgreSQL did not return the created identity user.");
    }

    return mapIdentityUser(row);
  }

  async recordLegalConsents(
    transaction: DatabaseTransaction,
    userId: string,
    consents: readonly LegalConsent[]
  ): Promise<void> {
    await transaction.client.query(
      `INSERT INTO identity.legal_consents (user_id, document, version)
       SELECT $1, consent.document, consent.version
         FROM unnest($2::text[], $3::text[]) AS consent(document, version)
       ON CONFLICT DO NOTHING`,
      [
        userId,
        consents.map((consent) => consent.document),
        consents.map((consent) => consent.version)
      ]
    );
  }
}
