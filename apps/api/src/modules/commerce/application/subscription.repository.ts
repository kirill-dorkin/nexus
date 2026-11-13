import type {
  OwnSubscription,
  SubscriptionOffer,
  SubscriptionBillingPeriod,
  SubscriptionPlan,
  SubscriptionPlanPrice
} from "@platform/contracts";
import type { DatabaseTransaction } from "@platform/database";

import type { PendingSubscription } from "./subscription-checkout.command";

export type CatalogEntitlementState = Readonly<{
  grantSource: "subscription" | "manual";
  expiresAt: string | null;
}>;

/** The plan is missing, archived or in another organization. */
export class PlanNotActiveError extends Error {
  constructor() {
    super("Subscription plan is not active.");
  }
}

/** ADR-0087: plans, their immutable prices and the catalog access right. */
export abstract class SubscriptionRepository {
  abstract createPlan(
    transaction: DatabaseTransaction,
    plan: Readonly<{
      organizationId: string;
      slug: string;
      name: string;
      createdByUserId: string;
    }>
  ): Promise<SubscriptionPlan>;

  abstract archivePlan(
    transaction: DatabaseTransaction,
    organizationId: string,
    planId: string
  ): Promise<SubscriptionPlan | null>;

  abstract createPlanPrice(
    transaction: DatabaseTransaction,
    price: Readonly<{
      organizationId: string;
      planId: string;
      amountMinor: number;
      currency: string;
      billingPeriod: SubscriptionBillingPeriod;
      createdByUserId: string;
    }>
  ): Promise<SubscriptionPlanPrice>;

  abstract archivePlanPrice(
    transaction: DatabaseTransaction,
    organizationId: string,
    priceId: string
  ): Promise<SubscriptionPlanPrice | null>;

  /** The learner's active catalog Entitlement that has not expired at `at`, if any. */
  abstract findEffectiveCatalogEntitlement(
    transaction: DatabaseTransaction,
    organizationId: string,
    userId: string,
    at: Date
  ): Promise<CatalogEntitlementState | null>;

  abstract hasActiveOffer(
    transaction: DatabaseTransaction,
    organizationId: string
  ): Promise<boolean>;

  abstract publicOffers(
    transaction: DatabaseTransaction,
    organizationSlug: string
  ): Promise<SubscriptionOffer[]>;

  abstract activeOffers(
    transaction: DatabaseTransaction,
    organizationId: string
  ): Promise<SubscriptionOffer[]>;

  /** Inserts or returns the pending subscription for this key; null if the price is not active. */
  abstract openPending(
    transaction: DatabaseTransaction,
    input: Readonly<{
      organizationId: string;
      userId: string;
      priceId: string;
      idempotencyKey: string;
      termsVersion: string;
    }>
  ): Promise<(PendingSubscription & { status: string }) | null>;

  abstract hasChargingSubscription(
    transaction: DatabaseTransaction,
    organizationId: string,
    userId: string
  ): Promise<boolean>;

  abstract ownSubscription(
    transaction: DatabaseTransaction,
    organizationId: string,
    userId: string
  ): Promise<OwnSubscription["subscription"]>;

  abstract applyCancellation(
    transaction: DatabaseTransaction,
    organizationId: string,
    subscriptionId: string
  ): Promise<void>;
}
