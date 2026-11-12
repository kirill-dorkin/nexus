import { Injectable } from "@nestjs/common";
import type {
  SubscriptionPlan,
  SubscriptionPlanPrice
} from "@platform/contracts";
import type { DatabaseTransaction } from "@platform/database";

import {
  PlanNotActiveError,
  SubscriptionRepository,
  type CatalogEntitlementState
} from "../application/subscription.repository";

type PlanRow = {
  id: string;
  organization_id: string;
  slug: string;
  name: string;
  status: SubscriptionPlan["status"];
  archived_at: Date | null;
};

type PriceRow = {
  id: string;
  organization_id: string;
  plan_id: string;
  amount_minor: number;
  currency: string;
  billing_period: SubscriptionPlanPrice["billingPeriod"];
  status: SubscriptionPlanPrice["status"];
  archived_at: Date | null;
};

const PLAN_COLUMNS =
  "id::text, organization_id::text, slug, name, status, archived_at";
const PRICE_COLUMNS =
  "id::text, organization_id::text, plan_id::text, amount_minor, currency, billing_period, status, archived_at";

const plan = (row: PlanRow): SubscriptionPlan => ({
  id: row.id,
  organizationId: row.organization_id,
  slug: row.slug,
  name: row.name,
  status: row.status,
  archivedAt: row.archived_at?.toISOString() ?? null
});

const price = (row: PriceRow): SubscriptionPlanPrice => ({
  id: row.id,
  organizationId: row.organization_id,
  planId: row.plan_id,
  amountMinor: row.amount_minor,
  currency: row.currency,
  billingPeriod: row.billing_period,
  status: row.status,
  archivedAt: row.archived_at?.toISOString() ?? null
});

function first<T>(rows: T[]): T {
  const row = rows[0];
  if (row === undefined) throw new Error("PostgreSQL returned no row.");
  return row;
}

@Injectable()
export class PostgresSubscriptionRepository extends SubscriptionRepository {
  async createPlan(
    transaction: DatabaseTransaction,
    input: Parameters<SubscriptionRepository["createPlan"]>[1]
  ): Promise<SubscriptionPlan> {
    const result = await transaction.client.query<PlanRow>(
      `INSERT INTO commerce.subscription_plans
         (organization_id, slug, name, created_by_user_id)
       VALUES ($1, $2, $3, $4)
       RETURNING ${PLAN_COLUMNS}`,
      [input.organizationId, input.slug, input.name, input.createdByUserId]
    );
    return plan(first(result.rows));
  }

  async archivePlan(
    transaction: DatabaseTransaction,
    organizationId: string,
    planId: string
  ): Promise<SubscriptionPlan | null> {
    const result = await transaction.client.query<PlanRow>(
      `UPDATE commerce.subscription_plans
          SET status = 'archived', archived_at = now(), updated_at = now()
        WHERE organization_id = $1 AND id = $2 AND status = 'active'
        RETURNING ${PLAN_COLUMNS}`,
      [organizationId, planId]
    );
    const row = result.rows[0];
    return row === undefined ? null : plan(row);
  }

  async createPlanPrice(
    transaction: DatabaseTransaction,
    input: Parameters<SubscriptionRepository["createPlanPrice"]>[1]
  ): Promise<SubscriptionPlanPrice> {
    const result = await transaction.client.query<PriceRow>(
      `INSERT INTO commerce.subscription_plan_prices
         (organization_id, plan_id, amount_minor, currency, billing_period, created_by_user_id)
       SELECT $1, plan.id, $3, $4, $5, $6
         FROM commerce.subscription_plans AS plan
        WHERE plan.organization_id = $1 AND plan.id = $2 AND plan.status = 'active'
       RETURNING ${PRICE_COLUMNS}`,
      [
        input.organizationId,
        input.planId,
        input.amountMinor,
        input.currency,
        input.billingPeriod,
        input.createdByUserId
      ]
    );
    const row = result.rows[0];
    if (row === undefined) throw new PlanNotActiveError();
    return price(row);
  }

  async archivePlanPrice(
    transaction: DatabaseTransaction,
    organizationId: string,
    priceId: string
  ): Promise<SubscriptionPlanPrice | null> {
    const result = await transaction.client.query<PriceRow>(
      `UPDATE commerce.subscription_plan_prices
          SET status = 'archived', archived_at = now(), updated_at = now()
        WHERE organization_id = $1 AND id = $2 AND status = 'active'
        RETURNING ${PRICE_COLUMNS}`,
      [organizationId, priceId]
    );
    const row = result.rows[0];
    return row === undefined ? null : price(row);
  }

  async findEffectiveCatalogEntitlement(
    transaction: DatabaseTransaction,
    organizationId: string,
    userId: string,
    at: Date
  ): Promise<CatalogEntitlementState | null> {
    const result = await transaction.client.query<{
      grant_source: CatalogEntitlementState["grantSource"];
      expires_at: Date | null;
    }>(
      `SELECT grant_source, expires_at
         FROM commerce.catalog_entitlements
        WHERE organization_id = $1 AND user_id = $2 AND status = 'active'
          AND granted_at <= $3 AND (expires_at IS NULL OR expires_at > $3)`,
      [organizationId, userId, at]
    );
    const row = result.rows[0];
    return row === undefined
      ? null
      : {
          grantSource: row.grant_source,
          expiresAt: row.expires_at?.toISOString() ?? null
        };
  }
}
