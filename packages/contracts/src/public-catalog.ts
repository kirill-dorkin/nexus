import { z } from "zod";

import {
  organizationSlugSchema,
  resourceSlugSchema,
  uuidSchema
} from "./common";
import { commerceBillingTypeSchema } from "./commerce";
import { learningOfferingDeliveryModeSchema } from "./learning-delivery";
import { customerEntryPolicySchema } from "./organizations";

const nullableDateTimeSchema = z.iso.datetime().nullable();
const publicCurrencySchema = z.string().regex(/^[A-Z]{3}$/);

export const publicCatalogOrganizationSchema = z
  .object({
    slug: organizationSlugSchema,
    name: z.string().trim().min(1).max(160)
  })
  .strict();

export const publicCatalogProductOrganizationSchema =
  publicCatalogOrganizationSchema.extend({
    customerEntryPolicy: customerEntryPolicySchema
  });

export const publicCatalogPriceSchema = z
  .object({
    id: uuidSchema,
    amountMinor: z.number().int().positive().max(2147483647),
    currency: publicCurrencySchema,
    billingType: commerceBillingTypeSchema
  })
  .strict();

export const publicCatalogOfferingSchema = z
  .object({
    slug: resourceSlugSchema,
    name: z.string().trim().min(1).max(160),
    deliveryMode: learningOfferingDeliveryModeSchema,
    startsAt: nullableDateTimeSchema,
    endsAt: nullableDateTimeSchema
  })
  .strict();

export const publicCatalogProductSchema = z
  .object({
    slug: resourceSlugSchema,
    name: z.string().trim().min(1).max(160),
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
    organization: publicCatalogProductOrganizationSchema,
    product: publicCatalogProductSchema
  })
  .strict();

export type PublicCatalogOrganization = z.infer<
  typeof publicCatalogOrganizationSchema
>;
export type PublicCatalogProductOrganization = z.infer<
  typeof publicCatalogProductOrganizationSchema
>;
export type PublicCatalogPrice = z.infer<typeof publicCatalogPriceSchema>;
export type PublicCatalogOffering = z.infer<typeof publicCatalogOfferingSchema>;
export type PublicCatalogProduct = z.infer<typeof publicCatalogProductSchema>;
export type PublicCatalog = z.infer<typeof publicCatalogSchema>;
export type PublicCatalogProductResponse = z.infer<
  typeof publicCatalogProductResponseSchema
>;
