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
  joinedAt: z.iso.datetime()
});

export const projectTeamSchema = z.object({
  id: projectTeamIdSchema,
  name: projectTeamNameSchema,
  status: z.enum(["active", "archived"]),
  members: z.array(projectTeamMemberSchema),
  createdAt: z.iso.datetime()
});

export const projectRepositoryReferenceSchema = z.object({
  bindingId: uuidSchema,
  repositoryMappingId: uuidSchema,
  githubRepositoryId: z.string().min(1),
  fullName: z.string().min(3).max(260),
  availability: z.enum(["active", "suspended", "removed"]),
  connectedAt: z.iso.datetime()
});

export const projectSchema = z.object({
  id: projectIdSchema,
  name: projectNameSchema,
  status: z.enum(["active", "archived"]),
  teamId: projectTeamIdSchema,
  repository: projectRepositoryReferenceSchema.nullable(),
  createdAt: z.iso.datetime()
});

export const projectActivityFactTypeSchema = z.enum([
  "pull_request",
  "pull_request_review",
  "check_run",
  "check_suite"
]);

const githubExternalIdSchema = z.string().regex(/^[1-9][0-9]*$/);
const githubShaSchema = z.string().regex(/^[0-9a-f]{40,64}$/);

export const projectActivityActorSchema = z.object({
  githubUserId: githubExternalIdSchema.nullable(),
  login: z.string().trim().min(1).max(255).nullable()
}).strict();

export const projectActivityItemSchema = z.object({
  id: uuidSchema,
  repositoryBindingId: uuidSchema,
  repositoryMappingId: uuidSchema,
  sourceDeliveryId: uuidSchema,
  factType: projectActivityFactTypeSchema,
  action: z.string().regex(/^[a-z][a-z0-9_]{0,99}$/),
  githubRepositoryId: githubExternalIdSchema,
  githubObjectId: githubExternalIdSchema,
  githubPullRequestId: githubExternalIdSchema.nullable(),
  githubPullRequestNumber: z.number().int().positive().nullable(),
  subject: projectActivityActorSchema.nullable(),
  sender: projectActivityActorSchema.nullable(),
  githubAppId: githubExternalIdSchema.nullable(),
  name: z.string().trim().min(1).max(255).nullable(),
  state: z.string().trim().min(1).max(100).nullable(),
  status: z.string().trim().min(1).max(100).nullable(),
  conclusion: z.string().trim().min(1).max(100).nullable(),
  headSha: githubShaSchema.nullable(),
  commitSha: githubShaSchema.nullable(),
  isDraft: z.boolean().nullable(),
  isMerged: z.boolean().nullable(),
  providerCreatedAt: z.iso.datetime().nullable(),
  providerUpdatedAt: z.iso.datetime().nullable(),
  providerSubmittedAt: z.iso.datetime().nullable(),
  providerStartedAt: z.iso.datetime().nullable(),
  providerCompletedAt: z.iso.datetime().nullable(),
  sourceReceivedAt: z.iso.datetime(),
  recordedAt: z.iso.datetime()
}).strict();

export const projectActivityQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  cursor: z.string().min(1).max(1000).optional()
}).strict();

export const projectActivityPageSchema = z.object({
  project: projectSchema,
  items: z.array(projectActivityItemSchema),
  nextCursor: z.string().nullable()
}).strict();

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
export type ProjectActivityFactType = z.infer<typeof projectActivityFactTypeSchema>;
export type ProjectActivityActor = z.infer<typeof projectActivityActorSchema>;
export type ProjectActivityItem = z.infer<typeof projectActivityItemSchema>;
export type ProjectActivityQuery = z.infer<typeof projectActivityQuerySchema>;
export type ProjectActivityPage = z.infer<typeof projectActivityPageSchema>;
