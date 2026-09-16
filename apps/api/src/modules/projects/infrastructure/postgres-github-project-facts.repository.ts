import type { DatabaseTransaction } from "@platform/database";

import {
  GitHubProjectFactsRepository,
  type NormalizedGitHubProjectFact,
  type ProjectRepositoryBindingAt
} from "../application/github-project-facts.repository";

type BindingRow = {
  repository_binding_id: string;
  project_id: string;
};

type IdRow = { id: string };

export class PostgresGitHubProjectFactsRepository extends GitHubProjectFactsRepository {
  async resolveRepositoryBindingAt(
    transaction: DatabaseTransaction,
    input: Parameters<GitHubProjectFactsRepository["resolveRepositoryBindingAt"]>[1]
  ): Promise<ProjectRepositoryBindingAt | null> {
    const result = await transaction.client.query<BindingRow>(
      `SELECT repository_binding_id::text, project_id::text
       FROM platform_internal.resolve_project_repository_binding_at($1, $2, $3)`,
      [input.organizationId, input.githubRepositoryMappingId, input.sourceReceivedAt]
    );
    const row = result.rows[0];
    return row === undefined
      ? null
      : {
          repositoryBindingId: row.repository_binding_id,
          projectId: row.project_id
        };
  }

  async record(
    transaction: DatabaseTransaction,
    fact: NormalizedGitHubProjectFact
  ): Promise<string> {
    const result = await transaction.client.query<IdRow>(
      `INSERT INTO projects.github_project_facts (
         organization_id,
         project_id,
         repository_binding_id,
         github_repository_mapping_id,
         source_inbox_id,
         source_delivery_id,
         source_payload_sha256,
         fact_type,
         action,
         github_repository_id,
         github_object_id,
         github_pull_request_id,
         github_pull_request_number,
         github_subject_user_id,
         github_subject_user_login,
         github_sender_user_id,
         github_sender_user_login,
         github_app_id,
         name,
         state,
         status,
         conclusion,
         head_sha,
         commit_sha,
         is_draft,
         is_merged,
         provider_created_at,
         provider_updated_at,
         provider_submitted_at,
         provider_started_at,
         provider_completed_at,
         source_received_at
       ) VALUES (
         $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16,
         $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32
       )
       ON CONFLICT (source_inbox_id) DO NOTHING
       RETURNING id::text`,
      [
        fact.organizationId,
        fact.projectId,
        fact.repositoryBindingId,
        fact.githubRepositoryMappingId,
        fact.sourceInboxId,
        fact.sourceDeliveryId,
        fact.sourcePayloadSha256,
        fact.factType,
        fact.action,
        fact.githubRepositoryId,
        fact.githubObjectId,
        fact.githubPullRequestId,
        fact.githubPullRequestNumber,
        fact.githubSubjectUserId,
        fact.githubSubjectUserLogin,
        fact.githubSenderUserId,
        fact.githubSenderUserLogin,
        fact.githubAppId,
        fact.name,
        fact.state,
        fact.status,
        fact.conclusion,
        fact.headSha,
        fact.commitSha,
        fact.isDraft,
        fact.isMerged,
        fact.providerCreatedAt,
        fact.providerUpdatedAt,
        fact.providerSubmittedAt,
        fact.providerStartedAt,
        fact.providerCompletedAt,
        fact.sourceReceivedAt
      ]
    );
    const inserted = result.rows[0]?.id;
    if (inserted !== undefined) return inserted;

    const existing = await transaction.client.query<IdRow>(
      `SELECT id::text
       FROM projects.github_project_facts
       WHERE organization_id = $1 AND source_inbox_id = $2`,
      [fact.organizationId, fact.sourceInboxId]
    );
    const existingId = existing.rows[0]?.id;
    if (existingId === undefined) {
      throw new Error("GitHub Project fact conflict did not resolve to an existing tenant fact.");
    }
    return existingId;
  }
}
