import type { DatabaseTransaction } from "@platform/database";

export type GitHubWebhookRoutingStatus =
  | "mapped"
  | "unmapped_installation"
  | "unmapped_repository"
  | "repository_mismatch"
  | "not_applicable";

export type AcceptedGitHubWebhook = Readonly<{
  inserted: boolean;
  routingStatus: GitHubWebhookRoutingStatus;
  organizationId: string | null;
  existingPayloadSha256: string | null;
}>;

export type GitHubWebhookInboxInput = Readonly<{
  deliveryId: string;
  eventName: string;
  action: string | null;
  githubInstallationId: string | null;
  githubRepositoryId: string | null;
  payloadSha256: string;
  payload: Readonly<Record<string, unknown>>;
}>;

export abstract class GitHubWebhookInboxRepository {
  abstract accept(
    transaction: DatabaseTransaction,
    input: GitHubWebhookInboxInput
  ): Promise<AcceptedGitHubWebhook>;
}
