import { Injectable } from "@nestjs/common";
import type { IdentityUser } from "@platform/contracts";
import type { DatabaseTransaction } from "@platform/database";

import { IdentityRepository } from "../application/identity.repository";

type IdentityUserRow = {
  id: string;
  email: string;
  display_name: string | null;
  status: IdentityUser["status"];
};

@Injectable()
export class PostgresIdentityRepository extends IdentityRepository {
  async findById(
    transaction: DatabaseTransaction,
    userId: string
  ): Promise<IdentityUser | null> {
    const result = await transaction.client.query<IdentityUserRow>(
      `SELECT id::text, email, display_name, status
         FROM identity.users
        WHERE id = $1`,
      [userId]
    );
    const row = result.rows[0];

    if (row === undefined) {
      return null;
    }

    return {
      id: row.id,
      email: row.email,
      displayName: row.display_name,
      status: row.status
    };
  }
}
