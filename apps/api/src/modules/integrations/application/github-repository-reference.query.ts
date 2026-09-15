import type { DatabaseTransaction } from "@platform/database";

export type GitHubRepositoryAvailability = "active" | "suspended" | "removed";

export type GitHubRepositoryReference = Readonly<{
  repositoryMappingId: string;
  githubRepositoryId: string;
  fullName: string;
  availability: GitHubRepositoryAvailability;
}>;

export abstract class GitHubRepositoryReferenceQuery {
  abstract findRepositoryReference(
    transaction: DatabaseTransaction,
    organizationId: string,
    repositoryMappingId: string
  ): Promise<GitHubRepositoryReference | null>;
}
