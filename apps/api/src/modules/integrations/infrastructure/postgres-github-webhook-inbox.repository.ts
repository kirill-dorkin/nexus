import { Injectable } from "@nestjs/common";
import type { DatabaseTransaction } from "@platform/database";

import {
  GitHubWebhookInboxRepository,
  type AcceptedGitHubWebhook,
  type GitHubWebhookInboxInput,
  type GitHubWebhookRoutingStatus
} from "../application/github-webhook-inbox.repository";

type IngestRow = {
  inserted: boolean;
  routing_status: GitHubWebhookRoutingStatus;
  organization_id: string | null;
  existing_payload_sha256: string | null;
};

@Injectable()
export class PostgresGitHubWebhookInboxRepository extends GitHubWebhookInboxRepository {
  async accept(
    transaction: DatabaseTransaction,
    input: GitHubWebhookInboxInput
  ): Promise<AcceptedGitHubWebhook> {
    const result = await transaction.client.query<IngestRow>(
      `SELECT
         inserted,
         routing_status,
         organization_id::text,
         existing_payload_sha256
       FROM platform_internal.ingest_github_webhook(
         $1::uuid,
         $2::text,
         $3::text,
         $4::bigint,
         $5::bigint,
         $6::text,
         $7::jsonb
       )`,
      [
        input.deliveryId,
        input.eventName,
        input.action,
        input.githubInstallationId,
        input.githubRepositoryId,
        input.payloadSha256,
        JSON.stringify(input.payload)
      ]
    );

    const row = result.rows[0];
    if (row === undefined) {
      throw new Error("GitHub webhook inbox ingest returned no result.");
    }

    return {
      inserted: row.inserted,
      routingStatus: row.routing_status,
      organizationId: row.organization_id,
      existingPayloadSha256: row.existing_payload_sha256
    };
  }
}
