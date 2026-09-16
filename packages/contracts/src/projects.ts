import { z } from "zod";
import { uuidSchema } from "./common";

export const projectNameSchema = z.string().trim().min(1).max(180);
export const projectTeamNameSchema = z.string().trim().min(1).max(160);
export const projectIdSchema = uuidSchema;
export const projectTeamIdSchema = uuidSchema;

export const createProjectRequestSchema = z.object({
  name: projectNameSchema,
  teamId: projectTeamIdSchema
});

export const createProjectTeamRequestSchema = z.object({
  name: projectTeamNameSchema,
  members: z.array(uuidSchema).min(1).max(50)
});

export const connectProjectRepositoryRequestSchema = z.object({
  repositoryMappingId: uuidSchema
});

export const projectTeamMemberSchema = z.object({
  userId: uuidSchema,
  joinedAt: z.string().datetime()
});

export const projectTeamSchema = z.object({
  id: projectTeamIdSchema,
  name: projectTeamNameSchema,
  status: z.enum(["active", "archived"]),
  members: z.array(projectTeamMemberSchema),
  createdAt: z.string().datetime()
});

export const projectRepositoryReferenceSchema = z.object({
  bindingId: uuidSchema,
  repositoryMappingId: uuidSchema,
  githubRepositoryId: z.string().min(1),
  fullName: z.string().min(3).max(260),
  availability: z.enum(["active", "suspended", "removed"]),
  connectedAt: z.string().datetime()
});

export const projectSchema = z.object({
  id: projectIdSchema,
  name: projectNameSchema,
  status: z.enum(["active", "archived"]),
  teamId: projectTeamIdSchema,
  repository: projectRepositoryReferenceSchema.nullable(),
  createdAt: z.string().datetime()
});

export type CreateProjectRequest = z.infer<typeof createProjectRequestSchema>;
export type CreateProjectTeamRequest = z.infer<typeof createProjectTeamRequestSchema>;
export type ConnectProjectRepositoryRequest = z.infer<
  typeof connectProjectRepositoryRequestSchema
>;
export type ProjectTeamMember = z.infer<typeof projectTeamMemberSchema>;
export type ProjectTeam = z.infer<typeof projectTeamSchema>;
export type ProjectRepositoryReference = z.infer<
  typeof projectRepositoryReferenceSchema
>;
export type Project = z.infer<typeof projectSchema>;
