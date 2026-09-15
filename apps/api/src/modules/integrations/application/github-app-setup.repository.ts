import type {
  GitHubInstallationMapping,
  GitHubRepositoryMapping
} from "@platform/contracts";
import type { DatabaseTransaction } from "@platform/database";

export class GitHubIntegrationOwnershipConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GitHubIntegrationOwnershipConflictError";
  }
}

export type GitHubRepositorySnapshot = Readonly<{
  githubRepositoryId: string;
  fullName: string;
}>;

export type VerifiedGitHubInstallation = Readonly<{
  githubInstallationId: string;
  accountId: string;
  accountLogin: string;
  accountType: string;
  repositorySelection: "all" | "selected";
  repositories: readonly GitHubRepositorySnapshot[];
}>;

export type GitHubSetupCallbackContext = Readonly<{
  setupSessionId: string;
  organizationId: string;
}>;

export type GitHubOAuthCallbackContext = GitHubSetupCallbackContext &
  Readonly<{
    githubInstallationId: string;
  }>;

export abstract class GitHubAppSetupRepository {
  abstract createSetupSession(
    transaction: DatabaseTransaction,
    input: Readonly<{
      id: string;
      organizationId: string;
      initiatedByUserId: string;
      installationStateSha256: string;
      expiresAt: Date;
    }>
  ): Promise<void>;

  abstract advanceToOAuth(
    transaction: DatabaseTransaction,
    input: Readonly<{
      installationStateSha256: string;
      userId: string;
      githubInstallationId: string;
      oauthStateSha256: string;
    }>
  ): Promise<GitHubSetupCallbackContext | null>;

  abstract consumeOAuthState(
    transaction: DatabaseTransaction,
    input: Readonly<{
      oauthStateSha256: string;
      userId: string;
    }>
  ): Promise<GitHubOAuthCallbackContext | null>;

  abstract completeSetup(
    transaction: DatabaseTransaction,
    input: Readonly<{
      setupSessionId: string;
      organizationId: string;
      linkedByUserId: string;
      installation: VerifiedGitHubInstallation;
      syncedAt: Date;
    }>
  ): Promise<GitHubInstallationMapping>;

  abstract listInstallations(
    transaction: DatabaseTransaction,
    organizationId: string
  ): Promise<readonly GitHubInstallationMapping[]>;

  abstract suspendInstallation(
    transaction: DatabaseTransaction,
    input: Readonly<{
      organizationId: string;
      installationMappingId: string;
    }>
  ): Promise<GitHubInstallationMapping | null>;
}

export type { GitHubInstallationMapping, GitHubRepositoryMapping };
