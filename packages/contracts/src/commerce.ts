import { z } from "zod";

import { uuidSchema } from "./common";

export const entitlementStatusSchema = z.enum(["active", "revoked"]);

const optionalDateTimeSchema = z.string().datetime().nullable();

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

export const grantOfferingEntitlementRequestSchema = z.object({
  userId: uuidSchema,
  expiresAt: z.string().datetime().optional()
});

export type Entitlement = z.infer<typeof entitlementSchema>;
export type GrantOfferingEntitlementRequest = z.infer<
  typeof grantOfferingEntitlementRequestSchema
>;
