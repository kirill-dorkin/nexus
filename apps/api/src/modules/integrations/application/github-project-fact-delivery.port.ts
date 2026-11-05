import type { DatabaseTransaction } from "@platform/database";

export type GitHubProjectFactEventName =
  "pull_request" | "pull_request_review" | "check_run" | "check_suite";

export type GitHubProjectFactRoutingStatus =
  | "mapped"
  | "unmapped_installation"
  | "unmapped_repository"
  | "repository_mismatch"
  | "not_applicable";

export type GitHubProjectFactDeliveryClaim = Readonly<{
  inboxId: string;
  deliveryId: string;
  eventName: GitHubProjectFactEventName;
  action: string | null;
  githubInstallationId: string | null;
  githubRepositoryId: string | null;
  githubRepositoryMappingId: string | null;
  payloadSha256: string;
  payload: unknown;
  sourceReceivedAt: Date;
  routingStatus: GitHubProjectFactRoutingStatus;
  organizationId: string | null;
  attemptCount: number;
  failureCount: number;
}>;

export type GitHubProjectFactProcessingOutcome =
  "blocked" | "retryable" | "completed" | "rejected" | "dead_letter";

/**
 * What Projects may do with GitHub project-fact deliveries owned by
 * Integrations (ADR-0031): claim one under a lease and record the outcome.
 * Projects depends on this port, never on the Integrations tables.
 */
export abstract class GitHubProjectFactDeliveryPort {
  abstract claim(
    transaction: DatabaseTransaction,
    input: Readonly<{ leaseToken: string; leaseSeconds: number }>
  ): Promise<GitHubProjectFactDeliveryClaim | null>;

  abstract finish(
    transaction: DatabaseTransaction,
    input: Readonly<{
      inboxId: string;
      leaseToken: string;
      outcome: GitHubProjectFactProcessingOutcome;
      errorCode: string | null;
      availableAt: Date | null;
    }>
  ): Promise<boolean>;
}
