import { z } from "zod";

import { resourceSlugSchema, uuidSchema } from "./common";

/** ADR-0087: subscription access to an organization's catalog. */
export const subscriptionBillingPeriodSchema = z.enum([
  "month",
  "days_90",
  "year"
]);
export const subscriptionOfferStatusSchema = z.enum(["active", "archived"]);
export const subscriptionStatusSchema = z.enum([
  "pending",
  "active",
  "past_due",
  "cancelled",
  "revoked"
]);

const currencySchema = z.string().regex(/^[A-Z]{3}$/);
const nameSchema = z.string().trim().min(1).max(160);

export const subscriptionPlanSchema = z.object({
  id: uuidSchema,
  organizationId: uuidSchema,
  slug: resourceSlugSchema,
  name: nameSchema,
  status: subscriptionOfferStatusSchema,
  archivedAt: z.iso.datetime().nullable()
});

export const subscriptionPlanPriceSchema = z.object({
  id: uuidSchema,
  organizationId: uuidSchema,
  planId: uuidSchema,
  amountMinor: z.number().int().positive(),
  currency: currencySchema,
  billingPeriod: subscriptionBillingPeriodSchema,
  status: subscriptionOfferStatusSchema,
  archivedAt: z.iso.datetime().nullable()
});

export const createSubscriptionPlanRequestSchema = z
  .object({ slug: resourceSlugSchema, name: nameSchema })
  .strict();

export const createSubscriptionPlanPriceRequestSchema = z
  .object({
    amountMinor: z.number().int().positive().max(100_000_000),
    currency: currencySchema,
    billingPeriod: subscriptionBillingPeriodSchema
  })
  .strict();

/**
 * The caller's access to an organization's catalog. `subscription` and `manual` come from a
 * catalog Entitlement until `until`; `trial` is the first days after the account was created.
 */
export const catalogAccessSchema = z.object({
  access: z.enum(["subscription", "manual", "trial", "none"]),
  until: z.iso.datetime().nullable(),
  trialEndsAt: z.iso.datetime()
});

export type SubscriptionBillingPeriod = z.infer<
  typeof subscriptionBillingPeriodSchema
>;
export type SubscriptionPlan = z.infer<typeof subscriptionPlanSchema>;
export type SubscriptionPlanPrice = z.infer<typeof subscriptionPlanPriceSchema>;
export type CreateSubscriptionPlanRequest = z.infer<
  typeof createSubscriptionPlanRequestSchema
>;
export type CreateSubscriptionPlanPriceRequest = z.infer<
  typeof createSubscriptionPlanPriceRequestSchema
>;
export type CatalogAccess = z.infer<typeof catalogAccessSchema>;

export { SUBSCRIPTION_TERMS_VERSION } from "./subscription-terms";
import { SUBSCRIPTION_TERMS_VERSION } from "./subscription-terms";

/** One price a learner can subscribe to, as the subscription page shows it. */
export const subscriptionOfferSchema = z.object({
  priceId: uuidSchema,
  planSlug: resourceSlugSchema,
  planName: nameSchema,
  amountMinor: z.number().int().positive(),
  currency: currencySchema,
  billingPeriod: subscriptionBillingPeriodSchema
});

export const publicSubscriptionOffersSchema = z.object({
  offers: z.array(subscriptionOfferSchema)
});

export const ownSubscriptionSchema = z.object({
  subscription: z
    .object({
      id: uuidSchema,
      status: subscriptionStatusSchema,
      amountMinor: z.number().int().positive(),
      currency: currencySchema,
      billingPeriod: subscriptionBillingPeriodSchema,
      currentPeriodEnd: z.iso.datetime().nullable(),
      cancelledAt: z.iso.datetime().nullable()
    })
    .nullable(),
  access: catalogAccessSchema
});

const utmValueSchema = z.string().trim().min(1).max(100);

export const startSubscriptionCheckoutRequestSchema = z
  .object({
    priceId: uuidSchema,
    idempotencyKey: uuidSchema,
    /** The learner ticked «Согласен на автоматическое продление». */
    acceptRenewalTerms: z.literal(true),
    termsVersion: z.literal(SUBSCRIPTION_TERMS_VERSION),
    utm: z
      .object({
        source: utmValueSchema.optional(),
        medium: utmValueSchema.optional(),
        campaign: utmValueSchema.optional()
      })
      .strict()
      .optional()
  })
  .strict();

export const subscriptionCheckoutSchema = z.object({
  paymentUrl: z.url({ protocol: /^https$/ })
});

export type SubscriptionOffer = z.infer<typeof subscriptionOfferSchema>;
export type PublicSubscriptionOffers = z.infer<
  typeof publicSubscriptionOffersSchema
>;
export type OwnSubscription = z.infer<typeof ownSubscriptionSchema>;
export type StartSubscriptionCheckoutRequest = z.infer<
  typeof startSubscriptionCheckoutRequestSchema
>;
export type SubscriptionCheckout = z.infer<typeof subscriptionCheckoutSchema>;
