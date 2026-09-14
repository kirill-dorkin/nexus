import { Injectable } from "@nestjs/common";
import type { Entitlement } from "@platform/contracts";
import type { DatabaseTransaction } from "@platform/database";

import {
  CommerceRepository,
  type GrantOfferingEntitlement
} from "../application/commerce.repository";

type EntitlementRow = {
  id: string;
  organization_id: string;
  offering_id: string;
  user_id: string;
  status: Entitlement["status"];
  granted_at: Date;
  expires_at: Date | null;
  revoked_at: Date | null;
};

const entitlementSelect = `id::text,
  organization_id::text,
  offering_id::text,
  user_id::text,
  status,
  granted_at,
  expires_at,
  revoked_at`;

function mapEntitlement(row: EntitlementRow): Entitlement {
  return {
    id: row.id,
    organizationId: row.organization_id,
    offeringId: row.offering_id,
    userId: row.user_id,
    status: row.status,
    grantedAt: row.granted_at.toISOString(),
    expiresAt: row.expires_at?.toISOString() ?? null,
    revokedAt: row.revoked_at?.toISOString() ?? null
  };
}

@Injectable()
export class PostgresCommerceRepository extends CommerceRepository {
  async grantOfferingEntitlement(
    transaction: DatabaseTransaction,
    entitlement: GrantOfferingEntitlement
  ): Promise<Entitlement> {
    const result = await transaction.client.query<EntitlementRow>(
      `INSERT INTO commerce.entitlements
         (id, organization_id, offering_id, user_id, expires_at, granted_by_user_id)
       VALUES ($1, $2, $3, $4, $5::timestamptz, $6)
       ON CONFLICT (organization_id, offering_id, user_id)
       DO UPDATE SET status = 'active',
                     granted_at = now(),
                     expires_at = EXCLUDED.expires_at,
                     revoked_at = NULL,
                     granted_by_user_id = EXCLUDED.granted_by_user_id,
                     revoked_by_user_id = NULL,
                     updated_at = now()
       RETURNING ${entitlementSelect}`,
      [
        entitlement.id,
        entitlement.organizationId,
        entitlement.offeringId,
        entitlement.userId,
        entitlement.expiresAt,
        entitlement.grantedByUserId
      ]
    );
    const row = result.rows[0];
    if (row === undefined) {
      throw new Error("PostgreSQL did not return the granted entitlement.");
    }
    return mapEntitlement(row);
  }

  async findEntitlementById(
    transaction: DatabaseTransaction,
    organizationId: string,
    entitlementId: string
  ): Promise<Entitlement | null> {
    const result = await transaction.client.query<EntitlementRow>(
      `SELECT ${entitlementSelect}
         FROM commerce.entitlements
        WHERE organization_id = $1
          AND id = $2`,
      [organizationId, entitlementId]
    );
    const row = result.rows[0];
    return row === undefined ? null : mapEntitlement(row);
  }

  async findEffectiveOfferingEntitlement(
    transaction: DatabaseTransaction,
    organizationId: string,
    userId: string,
    offeringId: string
  ): Promise<Entitlement | null> {
    const result = await transaction.client.query<EntitlementRow>(
      `SELECT ${entitlementSelect}
         FROM commerce.entitlements
        WHERE organization_id = $1
          AND user_id = $2
          AND offering_id = $3
          AND status = 'active'
          AND granted_at <= now()
          AND (expires_at IS NULL OR expires_at > now())`,
      [organizationId, userId, offeringId]
    );
    const row = result.rows[0];
    return row === undefined ? null : mapEntitlement(row);
  }

  async revokeEntitlement(
    transaction: DatabaseTransaction,
    organizationId: string,
    entitlementId: string,
    revokedByUserId: string
  ): Promise<Entitlement | null> {
    const result = await transaction.client.query<EntitlementRow>(
      `UPDATE commerce.entitlements
          SET status = 'revoked',
              revoked_at = now(),
              revoked_by_user_id = $3,
              updated_at = now()
        WHERE organization_id = $1
          AND id = $2
          AND status = 'active'
       RETURNING ${entitlementSelect}`,
      [organizationId, entitlementId, revokedByUserId]
    );
    const row = result.rows[0];
    return row === undefined ? null : mapEntitlement(row);
  }
}
