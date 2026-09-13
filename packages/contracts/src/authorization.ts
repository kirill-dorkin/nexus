import { z } from "zod";

import { uuidSchema } from "./common";

export const authorizationScopeTypeSchema = z.enum([
  "organization",
  "course",
  "offering",
  "group",
  "team",
  "project"
]);

export const systemRoleKeySchema = z.enum([
  "organization_owner",
  "organization_admin",
  "instructor",
  "mentor",
  "learner"
]);

export const authorizationScopeSchema = z.object({
  type: authorizationScopeTypeSchema,
  id: uuidSchema
});

export const assignRoleRequestSchema = z.object({
  userId: uuidSchema,
  roleKey: systemRoleKeySchema,
  scope: authorizationScopeSchema
});

export type AuthorizationScopeType = z.infer<
  typeof authorizationScopeTypeSchema
>;
export type SystemRoleKey = z.infer<typeof systemRoleKeySchema>;
export type AssignRoleRequest = z.infer<typeof assignRoleRequestSchema>;
