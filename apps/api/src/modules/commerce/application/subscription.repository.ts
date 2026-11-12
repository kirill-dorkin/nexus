import type {
  SubscriptionBillingPeriod,
  SubscriptionPlan,
  SubscriptionPlanPrice
} from "@platform/contracts";
import type { DatabaseTransaction } from "@platform/database";

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
}
