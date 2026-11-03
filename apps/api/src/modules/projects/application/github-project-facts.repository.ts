import type { DatabaseTransaction } from "@platform/database";

export type GitHubProjectFactType =
  "pull_request" | "pull_request_review" | "check_run" | "check_suite";

export type ProjectRepositoryBindingAt = Readonly<{
  repositoryBindingId: string;
  projectId: string;
}>;

export type NormalizedGitHubProjectFact = Readonly<{
  organizationId: string;
  projectId: string;
  repositoryBindingId: string;
  githubRepositoryMappingId: string;
  sourceInboxId: string;
  sourceDeliveryId: string;
  sourcePayloadSha256: string;
  factType: GitHubProjectFactType;
  action: string;
  githubRepositoryId: string;
  githubObjectId: string;
  githubPullRequestId: string | null;
  githubPullRequestNumber: number | null;
  githubSubjectUserId: string | null;
  githubSubjectUserLogin: string | null;
  githubSenderUserId: string | null;
  githubSenderUserLogin: string | null;
  githubAppId: string | null;
  name: string | null;
  state: string | null;
  status: string | null;
  conclusion: string | null;
  headSha: string | null;
  commitSha: string | null;
  isDraft: boolean | null;
  isMerged: boolean | null;
  providerCreatedAt: Date | null;
  providerUpdatedAt: Date | null;
  providerSubmittedAt: Date | null;
  providerStartedAt: Date | null;
  providerCompletedAt: Date | null;
  sourceReceivedAt: Date;
}>;

export abstract class GitHubProjectFactsRepository {
  abstract resolveRepositoryBindingAt(
    transaction: DatabaseTransaction,
    input: Readonly<{
      organizationId: string;
      githubRepositoryMappingId: string;
      sourceReceivedAt: Date;
    }>
  ): Promise<ProjectRepositoryBindingAt | null>;

  abstract record(
    transaction: DatabaseTransaction,
    fact: NormalizedGitHubProjectFact
  ): Promise<string>;
}
