import { z } from "zod";

import { organizationSlugSchema, uuidSchema } from "./common";

export const createOrganizationRequestSchema = z.object({
  slug: organizationSlugSchema,
  name: z.string().trim().min(1).max(160)
});

export const organizationSchema = z.object({
  id: uuidSchema,
  slug: organizationSlugSchema,
  name: z.string().min(1).max(160),
  status: z.enum(["active", "suspended", "archived"])
});

export const customerEntryPolicySchema = z.enum(["closed", "open"]);

export const updateCustomerEntryPolicyRequestSchema = z
  .object({
    policy: customerEntryPolicySchema
  })
  .strict();

export const organizationCustomerEntryPolicySchema = z
  .object({
    policy: customerEntryPolicySchema
  })
  .strict();

export const organizationMembershipStatusSchema = z.enum([
  "invited",
  "active",
  "suspended",
  "left"
]);

export const organizationMembershipSchema = z.object({
  id: uuidSchema,
  organizationId: uuidSchema,
  userId: uuidSchema,
  status: organizationMembershipStatusSchema,
  joinedAt: z.string().datetime().nullable()
});

export const inviteOrganizationMemberRequestSchema = z.object({
  userId: uuidSchema
});

export type CreateOrganizationRequest = z.infer<
  typeof createOrganizationRequestSchema
>;
export type Organization = z.infer<typeof organizationSchema>;
export type CustomerEntryPolicy = z.infer<typeof customerEntryPolicySchema>;
export type UpdateCustomerEntryPolicyRequest = z.infer<
  typeof updateCustomerEntryPolicyRequestSchema
>;
export type OrganizationCustomerEntryPolicy = z.infer<
  typeof organizationCustomerEntryPolicySchema
>;
export type OrganizationMembershipStatus = z.infer<
  typeof organizationMembershipStatusSchema
>;
export type OrganizationMembership = z.infer<
  typeof organizationMembershipSchema
>;
export type InviteOrganizationMemberRequest = z.infer<
  typeof inviteOrganizationMemberRequestSchema
>;
