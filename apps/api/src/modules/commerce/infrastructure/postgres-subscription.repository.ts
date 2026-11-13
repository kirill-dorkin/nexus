import { Injectable } from "@nestjs/common";
import type {
  OwnSubscription,
  SubscriptionOffer,
  SubscriptionPlan,
  SubscriptionPlanPrice
} from "@platform/contracts";
import type { DatabaseTransaction } from "@platform/database";

import type { PendingSubscription } from "../application/subscription-checkout.command";
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

type OfferRow = {
  price_id: string;
  plan_slug: string;
  plan_name: string;
  amount_minor: number;
  currency: string;
  billing_period: SubscriptionOffer["billingPeriod"];
};

const offer = (row: OfferRow): SubscriptionOffer => ({
  priceId: row.price_id,
  planSlug: row.plan_slug,
  planName: row.plan_name,
  amountMinor: row.amount_minor,
  currency: row.currency,
  billingPeriod: row.billing_period
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

  async hasActiveOffer(
    transaction: DatabaseTransaction,
    organizationId: string
  ): Promise<boolean> {
    const result = await transaction.client.query<{ sells: boolean }>(
      `SELECT EXISTS (
         SELECT 1
           FROM commerce.subscription_plans AS plan
           JOIN commerce.subscription_plan_prices AS price
             ON price.organization_id = plan.organization_id AND price.plan_id = plan.id
          WHERE plan.organization_id = $1 AND plan.status = 'active' AND price.status = 'active'
       ) AS sells`,
      [organizationId]
    );
    return result.rows[0]?.sells === true;
  }

  async publicOffers(
    transaction: DatabaseTransaction,
    organizationSlug: string
  ): Promise<SubscriptionOffer[]> {
    const result = await transaction.client.query<OfferRow>(
      `SELECT price_id::text, plan_slug, plan_name, amount_minor, currency, billing_period
         FROM commerce.list_public_subscription_offers($1)`,
      [organizationSlug]
    );
    return result.rows.map(offer);
  }

  async activeOffers(
    transaction: DatabaseTransaction,
    organizationId: string
  ): Promise<SubscriptionOffer[]> {
    const result = await transaction.client.query<OfferRow>(
      `SELECT price.id::text AS price_id, plan.slug AS plan_slug, plan.name AS plan_name,
              price.amount_minor, price.currency, price.billing_period
         FROM commerce.subscription_plan_prices AS price
         JOIN commerce.subscription_plans AS plan
           ON plan.organization_id = price.organization_id AND plan.id = price.plan_id
        WHERE price.organization_id = $1 AND price.status = 'active' AND plan.status = 'active'
        ORDER BY plan.slug, price.currency,
                 array_position(ARRAY['month','days_90','year'], price.billing_period)`,
      [organizationId]
    );
    return result.rows.map(offer);
  }

  async openPending(
    transaction: DatabaseTransaction,
    input: Parameters<SubscriptionRepository["openPending"]>[1]
  ): Promise<(PendingSubscription & { status: string }) | null> {
    await transaction.client.query(
      `INSERT INTO commerce.subscriptions
         (organization_id, user_id, plan_price_id, amount_minor, currency, billing_period,
          idempotency_key, renewal_terms_version, renewal_consented_at)
       SELECT $1, $2, price.id, price.amount_minor, price.currency, price.billing_period,
              $4, $5, now()
         FROM commerce.subscription_plan_prices AS price
         JOIN commerce.subscription_plans AS plan
           ON plan.organization_id = price.organization_id AND plan.id = price.plan_id
        WHERE price.organization_id = $1 AND price.id = $3
          AND price.status = 'active' AND plan.status = 'active'
       ON CONFLICT (organization_id, user_id, idempotency_key) DO NOTHING`,
      [
        input.organizationId,
        input.userId,
        input.priceId,
        input.idempotencyKey,
        input.termsVersion
      ]
    );
    const result = await transaction.client.query<{
      id: string;
      amount_minor: number;
      currency: string;
      billing_period: PendingSubscription["billingPeriod"];
      status: string;
      plan_price_id: string;
      plan_slug: string;
    }>(
      `SELECT subscription.id::text, subscription.amount_minor, subscription.currency,
              subscription.billing_period, subscription.status,
              subscription.plan_price_id::text, plan.slug AS plan_slug
         FROM commerce.subscriptions AS subscription
         JOIN commerce.subscription_plan_prices AS price
           ON price.organization_id = subscription.organization_id
          AND price.id = subscription.plan_price_id
         JOIN commerce.subscription_plans AS plan
           ON plan.organization_id = price.organization_id AND plan.id = price.plan_id
        WHERE subscription.organization_id = $1 AND subscription.user_id = $2
          AND subscription.idempotency_key = $3`,
      [input.organizationId, input.userId, input.idempotencyKey]
    );
    const row = result.rows[0];
    if (row?.plan_price_id !== input.priceId) return null;
    return {
      id: row.id,
      planSlug: row.plan_slug,
      amountMinor: row.amount_minor,
      currency: row.currency,
      billingPeriod: row.billing_period,
      status: row.status
    };
  }

  async hasChargingSubscription(
    transaction: DatabaseTransaction,
    organizationId: string,
    userId: string
  ): Promise<boolean> {
    const result = await transaction.client.query<{ charging: boolean }>(
      `SELECT EXISTS (
         SELECT 1 FROM commerce.subscriptions
          WHERE organization_id = $1 AND user_id = $2 AND status IN ('active', 'past_due')
       ) AS charging`,
      [organizationId, userId]
    );
    return result.rows[0]?.charging === true;
  }

  async ownSubscription(
    transaction: DatabaseTransaction,
    organizationId: string,
    userId: string
  ): Promise<OwnSubscription["subscription"]> {
    const result = await transaction.client.query<{
      id: string;
      status: NonNullable<OwnSubscription["subscription"]>["status"];
      amount_minor: number;
      currency: string;
      billing_period: NonNullable<
        OwnSubscription["subscription"]
      >["billingPeriod"];
      current_period_end: Date | null;
      cancelled_at: Date | null;
    }>(
      `SELECT id::text, status, amount_minor, currency, billing_period,
              current_period_end, cancelled_at
         FROM commerce.subscriptions
        WHERE organization_id = $1 AND user_id = $2 AND status <> 'pending'
        ORDER BY (status IN ('active', 'past_due')) DESC, created_at DESC
        LIMIT 1`,
      [organizationId, userId]
    );
    const row = result.rows[0];
    return row === undefined
      ? null
      : {
          id: row.id,
          status: row.status,
          amountMinor: row.amount_minor,
          currency: row.currency,
          billingPeriod: row.billing_period,
          currentPeriodEnd: row.current_period_end?.toISOString() ?? null,
          cancelledAt: row.cancelled_at?.toISOString() ?? null
        };
  }

  async applyCancellation(
    transaction: DatabaseTransaction,
    organizationId: string,
    subscriptionId: string
  ): Promise<void> {
    await transaction.client.query(
      `SELECT commerce.apply_subscription_event($1, $2, 'cancelled', NULL, NULL, NULL, now())`,
      [organizationId, subscriptionId]
    );
  }
}
