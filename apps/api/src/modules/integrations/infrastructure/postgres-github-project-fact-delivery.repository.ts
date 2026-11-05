import type { DatabaseTransaction } from "@platform/database";

import {
  GitHubProjectFactDeliveryPort,
  type GitHubProjectFactDeliveryClaim,
  type GitHubProjectFactEventName,
  type GitHubProjectFactRoutingStatus
} from "../application/github-project-fact-delivery.port";

type ClaimRow = {
  inbox_id: string;
  delivery_id: string;
  event_name: GitHubProjectFactEventName;
  action: string | null;
  github_installation_id: string | null;
  github_repository_id: string | null;
  github_repository_mapping_id: string | null;
  payload_sha256: string;
  payload: unknown;
  source_received_at: Date;
  routing_status: GitHubProjectFactRoutingStatus;
  organization_id: string | null;
  attempt_count: number;
  failure_count: number;
};

export class PostgresGitHubProjectFactDeliveryRepository extends GitHubProjectFactDeliveryPort {
  async claim(
    transaction: DatabaseTransaction,
    input: Parameters<GitHubProjectFactDeliveryPort["claim"]>[1]
  ): Promise<GitHubProjectFactDeliveryClaim | null> {
    const result = await transaction.client.query<ClaimRow>(
      `SELECT
         inbox_id::text,
         delivery_id::text,
         event_name,
         action,
         github_installation_id::text,
         github_repository_id::text,
         github_repository_mapping_id::text,
         payload_sha256,
         payload,
         source_received_at,
         routing_status,
         organization_id::text,
         attempt_count,
         failure_count
       FROM platform_internal.claim_github_webhook_project_fact($1, $2)`,
      [input.leaseToken, input.leaseSeconds]
    );
    const row = result.rows[0];
    if (row === undefined) return null;

    return {
      inboxId: row.inbox_id,
      deliveryId: row.delivery_id,
      eventName: row.event_name,
      action: row.action,
      githubInstallationId: row.github_installation_id,
      githubRepositoryId: row.github_repository_id,
      githubRepositoryMappingId: row.github_repository_mapping_id,
      payloadSha256: row.payload_sha256,
      payload: row.payload,
      sourceReceivedAt: row.source_received_at,
      routingStatus: row.routing_status,
      organizationId: row.organization_id,
      attemptCount: row.attempt_count,
      failureCount: row.failure_count
    };
  }

  async finish(
    transaction: DatabaseTransaction,
    input: Parameters<GitHubProjectFactDeliveryPort["finish"]>[1]
  ): Promise<boolean> {
    const result = await transaction.client.query<{ finished: boolean }>(
      `SELECT platform_internal.finish_github_webhook_project_fact($1, $2, $3, $4, $5)
         AS finished`,
      [
        input.inboxId,
        input.leaseToken,
        input.outcome,
        input.errorCode,
        input.availableAt
      ]
    );
    return result.rows[0]?.finished === true;
  }
}
