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

export type CreateOrganizationRequest = z.infer<
  typeof createOrganizationRequestSchema
>;
export type Organization = z.infer<typeof organizationSchema>;
