import { z } from "zod";

import { resourceSlugSchema, uuidSchema } from "./common";

export const entitlementStatusSchema = z.enum(["active", "revoked"]);
export const commerceProductStatusSchema = z.enum(["active", "archived"]);
export const commercePriceStatusSchema = z.enum(["active", "archived"]);
export const commerceBillingTypeSchema = z.enum(["one_time"]);

const optionalDateTimeSchema = z.string().datetime().nullable();
const commerceNameSchema = z.string().trim().min(1).max(160);
const currencySchema = z.string().regex(/^[A-Z]{3}$/);

export const entitlementSchema = z.object({
  id: uuidSchema,
  organizationId: uuidSchema,
  offeringId: uuidSchema,
  userId: uuidSchema,
  status: entitlementStatusSchema,
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

export const grantOfferingEntitlementRequestSchema = z.object({
  userId: uuidSchema,
  expiresAt: z.string().datetime().optional()
});

export type Entitlement = z.infer<typeof entitlementSchema>;
export type CommerceProduct = z.infer<typeof commerceProductSchema>;
export type CommercePrice = z.infer<typeof commercePriceSchema>;
export type CreateCommerceProductRequest = z.infer<
  typeof createCommerceProductRequestSchema
>;
export type CreateCommercePriceRequest = z.infer<
  typeof createCommercePriceRequestSchema
>;
export type GrantOfferingEntitlementRequest = z.infer<
  typeof grantOfferingEntitlementRequestSchema
>;
