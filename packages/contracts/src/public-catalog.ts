import { z } from "zod";

import { organizationSlugSchema, resourceSlugSchema, uuidSchema } from "./common";
import { commerceBillingTypeSchema, commerceCurrencySchema } from "./commerce";
import { learningOfferingDeliveryModeSchema } from "./learning-delivery";

const nullableDateTimeSchema = z.string().datetime().nullable();

export const publicCatalogOrganizationSchema = z
  .object({
    slug: organizationSlugSchema,
    name: z.string().min(1).max(160)
  })
  .strict();

export const publicCatalogPriceSchema = z
  .object({
    id: uuidSchema,
    amountMinor: z.number().int().positive(),
    currency: commerceCurrencySchema,
    billingType: commerceBillingTypeSchema
  })
  .strict();

export const publicCatalogOfferingSchema = z
  .object({
    slug: resourceSlugSchema,
    name: z.string().min(1).max(160),
    deliveryMode: learningOfferingDeliveryModeSchema,
    startsAt: nullableDateTimeSchema,
    endsAt: nullableDateTimeSchema
  })
  .strict();

export const publicCatalogProductSchema = z
  .object({
    slug: resourceSlugSchema,
    name: z.string().min(1).max(160),
    offering: publicCatalogOfferingSchema,
    prices: z.array(publicCatalogPriceSchema).min(1)
  })
  .strict();

export const publicCatalogSchema = z
  .object({
    organization: publicCatalogOrganizationSchema,
    products: z.array(publicCatalogProductSchema)
  })
  .strict();

export const publicCatalogProductResponseSchema = z
  .object({
    organization: publicCatalogOrganizationSchema,
    product: publicCatalogProductSchema
  })
  .strict();

export type PublicCatalogOrganization = z.infer<
  typeof publicCatalogOrganizationSchema
>;
export type PublicCatalogPrice = z.infer<typeof publicCatalogPriceSchema>;
export type PublicCatalogOffering = z.infer<typeof publicCatalogOfferingSchema>;
export type PublicCatalogProduct = z.infer<typeof publicCatalogProductSchema>;
export type PublicCatalog = z.infer<typeof publicCatalogSchema>;
export type PublicCatalogProductResponse = z.infer<
  typeof publicCatalogProductResponseSchema
>;
