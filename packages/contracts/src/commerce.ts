import { z } from "zod";

import { resourceSlugSchema, uuidSchema } from "./common";

export const entitlementStatusSchema = z.enum(["active", "revoked"]);
export const entitlementGrantSourceSchema = z.enum(["manual", "purchase"]);
export const commerceProductStatusSchema = z.enum(["active", "archived"]);
export const commercePriceStatusSchema = z.enum(["active", "archived"]);
export const commerceBillingTypeSchema = z.enum(["one_time"]);
export const purchaseStatusSchema = z.enum(["pending", "paid"]);

const optionalDateTimeSchema = z.string().datetime().nullable();
const commerceNameSchema = z.string().trim().min(1).max(160);
const currencySchema = z.string().regex(/^[A-Z]{3}$/);

export const entitlementSchema = z.object({
  id: uuidSchema,
  organizationId: uuidSchema,
  offeringId: uuidSchema,
  userId: uuidSchema,
  status: entitlementStatusSchema,
  grantSource: entitlementGrantSourceSchema,
  sourcePurchaseId: uuidSchema.nullable(),
  grantedAt: z.string().datetime(),
  expiresAt: optionalDateTimeSchema,
  revokedAt: optionalDateTimeSchema
});

export const commerceProductSchema = z.object({
  id: uuidSchema,
  organizationId: uuidSchema,
  offeringId: uuidSchema,
  slug: resourceSlugSchema,
  name: commerceNameSchema,
  status: commerceProductStatusSchema,
  createdAt: z.string().datetime(),
  archivedAt: optionalDateTimeSchema
});

export const commercePriceSchema = z.object({
  id: uuidSchema,
  organizationId: uuidSchema,
  productId: uuidSchema,
  amountMinor: z.number().int().positive().max(2147483647),
  currency: currencySchema,
  billingType: commerceBillingTypeSchema,
  status: commercePriceStatusSchema,
  createdAt: z.string().datetime(),
  archivedAt: optionalDateTimeSchema
});

export const purchaseSchema = z.object({
  id: uuidSchema,
  organizationId: uuidSchema,
  productId: uuidSchema,
  priceId: uuidSchema,
  offeringId: uuidSchema,
  purchaserUserId: uuidSchema,
  status: purchaseStatusSchema,
  amountMinor: z.number().int().positive().max(2147483647),
  currency: currencySchema,
  billingType: commerceBillingTypeSchema,
  idempotencyKey: uuidSchema,
  createdAt: z.string().datetime(),
  paidAt: optionalDateTimeSchema
});

export const purchaseCheckoutSchema = z.object({
  purchase: purchaseSchema,
  checkoutUrl: z.string().url(),
  checkoutExpiresAt: z.string().datetime()
});

export const createCommerceProductRequestSchema = z.object({
  offeringId: uuidSchema,
  slug: resourceSlugSchema,
  name: commerceNameSchema
});

export const createCommercePriceRequestSchema = z.object({
  amountMinor: z.number().int().positive().max(2147483647),
  currency: currencySchema,
  billingType: commerceBillingTypeSchema.default("one_time")
});

export const createPurchaseCheckoutRequestSchema = z
  .object({
    priceId: uuidSchema,
    idempotencyKey: uuidSchema
  })
  .strict();

export const grantOfferingEntitlementRequestSchema = z.object({
  userId: uuidSchema,
  expiresAt: z.string().datetime().optional()
});

export type Entitlement = z.infer<typeof entitlementSchema>;
export type CommerceProduct = z.infer<typeof commerceProductSchema>;
export type CommercePrice = z.infer<typeof commercePriceSchema>;
export type Purchase = z.infer<typeof purchaseSchema>;
export type PurchaseCheckout = z.infer<typeof purchaseCheckoutSchema>;
export type CreateCommerceProductRequest = z.infer<
  typeof createCommerceProductRequestSchema
>;
export type CreateCommercePriceRequest = z.infer<
  typeof createCommercePriceRequestSchema
>;
export type CreatePurchaseCheckoutRequest = z.infer<
  typeof createPurchaseCheckoutRequestSchema
>;
export type GrantOfferingEntitlementRequest = z.infer<
  typeof grantOfferingEntitlementRequestSchema
>;
