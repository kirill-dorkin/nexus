import { Injectable } from "@nestjs/common";
import type {
  CommercePrice,
  CommerceProduct,
  Entitlement
} from "@platform/contracts";
import type { DatabaseTransaction } from "@platform/database";

import {
  CommerceRepository,
  type CreateCommercePrice,
  type CreateCommerceProduct,
  type GrantOfferingEntitlement
} from "../application/commerce.repository";

type CommerceProductRow = {
  id: string;
  organization_id: string;
  offering_id: string;
  slug: string;
  name: string;
  status: CommerceProduct["status"];
  created_at: Date;
  archived_at: Date | null;
};

type CommercePriceRow = {
  id: string;
  organization_id: string;
  product_id: string;
  amount_minor: number;
  currency: string;
  billing_type: CommercePrice["billingType"];
  status: CommercePrice["status"];
  created_at: Date;
  archived_at: Date | null;
};

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

const productSelect = `id::text,
  organization_id::text,
  offering_id::text,
  slug,
  name,
  status,
  created_at,
  archived_at`;

const priceSelect = `id::text,
  organization_id::text,
  product_id::text,
  amount_minor,
  currency,
  billing_type,
  status,
  created_at,
  archived_at`;

const entitlementSelect = `id::text,
  organization_id::text,
  offering_id::text,
  user_id::text,
  status,
  granted_at,
  expires_at,
  revoked_at`;

function mapProduct(row: CommerceProductRow): CommerceProduct {
  return {
    id: row.id,
    organizationId: row.organization_id,
    offeringId: row.offering_id,
    slug: row.slug,
    name: row.name,
    status: row.status,
    createdAt: row.created_at.toISOString(),
    archivedAt: row.archived_at?.toISOString() ?? null
  };
}

function mapPrice(row: CommercePriceRow): CommercePrice {
  return {
    id: row.id,
    organizationId: row.organization_id,
    productId: row.product_id,
    amountMinor: row.amount_minor,
    currency: row.currency,
    billingType: row.billing_type,
    status: row.status,
    createdAt: row.created_at.toISOString(),
    archivedAt: row.archived_at?.toISOString() ?? null
  };
}

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
  async createProduct(
    transaction: DatabaseTransaction,
    product: CreateCommerceProduct
  ): Promise<CommerceProduct> {
    const result = await transaction.client.query<CommerceProductRow>(
      `INSERT INTO commerce.products
         (id, organization_id, offering_id, slug, name, created_by_user_id)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING ${productSelect}`,
      [
        product.id,
        product.organizationId,
        product.offeringId,
        product.slug,
        product.name,
        product.createdByUserId
      ]
    );
    const row = result.rows[0];
    if (row === undefined) {
      throw new Error("PostgreSQL did not return the created Commerce Product.");
    }
    return mapProduct(row);
  }

  async findProductById(
    transaction: DatabaseTransaction,
    organizationId: string,
    productId: string
  ): Promise<CommerceProduct | null> {
    const result = await transaction.client.query<CommerceProductRow>(
      `SELECT ${productSelect}
         FROM commerce.products
        WHERE organization_id = $1
          AND id = $2`,
      [organizationId, productId]
    );
    const row = result.rows[0];
    return row === undefined ? null : mapProduct(row);
  }

  async archiveProduct(
    transaction: DatabaseTransaction,
    organizationId: string,
    productId: string,
    archivedByUserId: string
  ): Promise<CommerceProduct | null> {
    const result = await transaction.client.query<CommerceProductRow>(
      `UPDATE commerce.products
          SET status = 'archived',
              archived_at = now(),
              archived_by_user_id = $3,
              updated_at = now()
        WHERE organization_id = $1
          AND id = $2
          AND status = 'active'
       RETURNING ${productSelect}`,
      [organizationId, productId, archivedByUserId]
    );
    const row = result.rows[0];
    return row === undefined ? null : mapProduct(row);
  }

  async hasActivePrices(
    transaction: DatabaseTransaction,
    organizationId: string,
    productId: string
  ): Promise<boolean> {
    const result = await transaction.client.query<{ exists: boolean }>(
      `SELECT EXISTS (
         SELECT 1
           FROM commerce.prices
          WHERE organization_id = $1
            AND product_id = $2
            AND status = 'active'
       ) AS exists`,
      [organizationId, productId]
    );
    return result.rows[0]?.exists ?? false;
  }

  async createPrice(
    transaction: DatabaseTransaction,
    price: CreateCommercePrice
  ): Promise<CommercePrice> {
    const result = await transaction.client.query<CommercePriceRow>(
      `INSERT INTO commerce.prices
         (id, organization_id, product_id, amount_minor, currency, billing_type, created_by_user_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING ${priceSelect}`,
      [
        price.id,
        price.organizationId,
        price.productId,
        price.amountMinor,
        price.currency,
        price.billingType,
        price.createdByUserId
      ]
    );
    const row = result.rows[0];
    if (row === undefined) {
      throw new Error("PostgreSQL did not return the created Commerce Price.");
    }
    return mapPrice(row);
  }

  async findPriceById(
    transaction: DatabaseTransaction,
    organizationId: string,
    priceId: string
  ): Promise<CommercePrice | null> {
    const result = await transaction.client.query<CommercePriceRow>(
      `SELECT ${priceSelect}
         FROM commerce.prices
        WHERE organization_id = $1
          AND id = $2`,
      [organizationId, priceId]
    );
    const row = result.rows[0];
    return row === undefined ? null : mapPrice(row);
  }

  async archivePrice(
    transaction: DatabaseTransaction,
    organizationId: string,
    priceId: string,
    archivedByUserId: string
  ): Promise<CommercePrice | null> {
    const result = await transaction.client.query<CommercePriceRow>(
      `UPDATE commerce.prices
          SET status = 'archived',
              archived_at = now(),
              archived_by_user_id = $3,
              updated_at = now()
        WHERE organization_id = $1
          AND id = $2
          AND status = 'active'
       RETURNING ${priceSelect}`,
      [organizationId, priceId, archivedByUserId]
    );
    const row = result.rows[0];
    return row === undefined ? null : mapPrice(row);
  }

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
