import { Injectable } from "@nestjs/common";
import type { DatabaseTransaction } from "@platform/database";

import { GitHubAppSetupRepository } from "./github-app-setup.repository";

export type GitHubRepositoryAvailability = "active" | "suspended" | "removed";

export type GitHubRepositoryReference = Readonly<{
  repositoryMappingId: string;
  githubRepositoryId: string;
  fullName: string;
  availability: GitHubRepositoryAvailability;
}>;

@Injectable()
export class GitHubRepositoryReferenceQuery {
  constructor(private readonly repositories: GitHubAppSetupRepository) {}

  async findRepositoryReference(
    transaction: DatabaseTransaction,
    organizationId: string,
    repositoryMappingId: string
  ): Promise<GitHubRepositoryReference | null> {
    const installations = await this.repositories.listInstallations(
      transaction,
      organizationId
    );

    for (const installation of installations) {
      const repository = installation.repositories.find(
        (candidate) => candidate.id === repositoryMappingId
      );
      if (repository === undefined) continue;

      const availability: GitHubRepositoryAvailability =
        installation.status === "suspended" || repository.status === "suspended"
          ? "suspended"
          : installation.status === "removed" || repository.status === "removed"
            ? "removed"
            : "active";

      return {
        repositoryMappingId: repository.id,
        githubRepositoryId: repository.githubRepositoryId,
        fullName: repository.fullName,
        availability
      };
    }

    return null;
  }
}
