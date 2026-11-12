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
