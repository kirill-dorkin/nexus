import type {
  OwnSubscription,
  SubscriptionBillingPeriod,
  SubscriptionOffer
} from "@platform/contracts";
import type { DatabaseTransaction } from "@platform/database";

export type PendingSubscription = Readonly<{
  id: string;
  /** The plan's slug: with period and currency it names the provider offer. */
  planSlug: string;
  amountMinor: number;
  currency: string;
  billingPeriod: SubscriptionBillingPeriod;
}>;

/**
 * Public Commerce interface for subscription checkout (ADR-0087 §5, §7). Runs inside the
 * caller's tenant transaction; the payment provider stays in Integrations.
 */
export abstract class SubscriptionCheckoutCommand {
  /** Active offers of an active organization for anyone, also anonymous visitors. */
  abstract publicOffers(
    transaction: DatabaseTransaction,
    organizationSlug: string
  ): Promise<SubscriptionOffer[]>;

  /** Active prices of active plans, for the subscription page. */
  abstract activeOffers(
    transaction: DatabaseTransaction,
    organizationId: string
  ): Promise<SubscriptionOffer[]>;

  /**
   * A pending subscription pinned to the price, idempotent per learner and key. Refuses
   * (409) when the learner already has a subscription that is being charged.
   */
  abstract openPending(
    transaction: DatabaseTransaction,
    input: Readonly<{
      organizationId: string;
      userId: string;
      priceId: string;
      idempotencyKey: string;
      termsVersion: string;
    }>
  ): Promise<PendingSubscription>;

  /** The learner's most relevant subscription: charging first, otherwise the latest. */
  abstract ownSubscription(
    transaction: DatabaseTransaction,
    organizationId: string,
    userId: string
  ): Promise<OwnSubscription["subscription"]>;

  /** The provider confirmed the cancellation: no more charges, access runs out. */
  abstract recordCancellation(
    transaction: DatabaseTransaction,
    organizationId: string,
    subscriptionId: string
  ): Promise<void>;
}
