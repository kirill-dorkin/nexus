import { z } from "zod";

const externalIdSchema = z.string().regex(/^[1-9][0-9]*$/);

export const githubIntegrationSetupSessionSchema = z.object({
  installationUrl: z.url(),
  expiresAt: z.iso.datetime()
});

export const githubRepositoryMappingSchema = z.object({
  id: z.uuid(),
  githubRepositoryId: externalIdSchema,
  fullName: z.string().min(3).max(260),
  status: z.enum(["active", "suspended", "removed"])
});

export const githubInstallationMappingSchema = z.object({
  id: z.uuid(),
  githubInstallationId: externalIdSchema,
  status: z.enum(["active", "suspended", "removed"]),
  account: z.object({
    id: externalIdSchema,
    login: z.string().min(1).max(255),
    type: z.string().min(1).max(100)
  }).nullable(),
  repositorySelection: z.enum(["all", "selected"]).nullable(),
  lastSyncedAt: z.iso.datetime().nullable(),
  repositories: z.array(githubRepositoryMappingSchema)
});

export const githubIntegrationViewSchema = z.object({
  installations: z.array(githubInstallationMappingSchema)
});

export type GitHubIntegrationSetupSession = z.infer<
  typeof githubIntegrationSetupSessionSchema
>;
export type GitHubRepositoryMapping = z.infer<
  typeof githubRepositoryMappingSchema
>;
export type GitHubInstallationMapping = z.infer<
  typeof githubInstallationMappingSchema
>;
export type GitHubIntegrationView = z.infer<typeof githubIntegrationViewSchema>;
