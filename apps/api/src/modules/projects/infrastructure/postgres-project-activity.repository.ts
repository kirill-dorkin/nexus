import type { ProjectActivityActor, ProjectActivityItem } from "@platform/contracts";
import type { DatabaseTransaction } from "@platform/database";

import {
  ProjectActivityRepository,
  type ProjectActivityPageRow
} from "../application/project-activity.repository";

type ActivityRow = {
  id: string;
  repository_binding_id: string;
  github_repository_mapping_id: string;
  source_delivery_id: string;
  fact_type: ProjectActivityItem["factType"];
  action: string;
  github_repository_id: string;
  github_object_id: string;
  github_pull_request_id: string | null;
  github_pull_request_number: number | null;
  github_subject_user_id: string | null;
  github_subject_user_login: string | null;
  github_sender_user_id: string | null;
  github_sender_user_login: string | null;
  github_app_id: string | null;
  name: string | null;
  state: string | null;
  status: string | null;
  conclusion: string | null;
  head_sha: string | null;
  commit_sha: string | null;
  is_draft: boolean | null;
  is_merged: boolean | null;
  provider_created_at: Date | null;
  provider_updated_at: Date | null;
  provider_submitted_at: Date | null;
  provider_started_at: Date | null;
  provider_completed_at: Date | null;
  source_received_at: Date;
  recorded_at: Date;
};

function actor(id: string | null, login: string | null): ProjectActivityActor | null {
  if (id === null && login === null) return null;
  return { githubUserId: id, login };
}

function iso(value: Date | null): string | null {
  return value === null ? null : value.toISOString();
}

export class PostgresProjectActivityRepository extends ProjectActivityRepository {
  async listForProject(
    transaction: DatabaseTransaction,
    organizationId: string,
    projectId: string,
    before: Parameters<ProjectActivityRepository["listForProject"]>[3],
    limit: number
  ): Promise<readonly ProjectActivityPageRow[]> {
    const result = await transaction.client.query<ActivityRow>(
      `SELECT
         id::text,
         repository_binding_id::text,
         github_repository_mapping_id::text,
         source_delivery_id::text,
         fact_type,
         action,
         github_repository_id::text,
         github_object_id::text,
         github_pull_request_id::text,
         github_pull_request_number,
         github_subject_user_id::text,
         github_subject_user_login,
         github_sender_user_id::text,
         github_sender_user_login,
         github_app_id::text,
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
         source_received_at,
         recorded_at
       FROM projects.github_project_facts
       WHERE organization_id = $1
         AND project_id = $2
         AND (
           $3::timestamptz IS NULL
           OR (source_received_at, id) < ($3::timestamptz, $4::uuid)
         )
       ORDER BY source_received_at DESC, id DESC
       LIMIT $5`,
      [
        organizationId,
        projectId,
        before?.sourceReceivedAt ?? null,
        before?.id ?? null,
        limit
      ]
    );

    return result.rows.map((row) => ({
      item: {
        id: row.id,
        repositoryBindingId: row.repository_binding_id,
        repositoryMappingId: row.github_repository_mapping_id,
        sourceDeliveryId: row.source_delivery_id,
        factType: row.fact_type,
        action: row.action,
        githubRepositoryId: row.github_repository_id,
        githubObjectId: row.github_object_id,
        githubPullRequestId: row.github_pull_request_id,
        githubPullRequestNumber: row.github_pull_request_number,
        subject: actor(row.github_subject_user_id, row.github_subject_user_login),
        sender: actor(row.github_sender_user_id, row.github_sender_user_login),
        githubAppId: row.github_app_id,
        name: row.name,
        state: row.state,
        status: row.status,
        conclusion: row.conclusion,
        headSha: row.head_sha,
        commitSha: row.commit_sha,
        isDraft: row.is_draft,
        isMerged: row.is_merged,
        providerCreatedAt: iso(row.provider_created_at),
        providerUpdatedAt: iso(row.provider_updated_at),
        providerSubmittedAt: iso(row.provider_submitted_at),
        providerStartedAt: iso(row.provider_started_at),
        providerCompletedAt: iso(row.provider_completed_at),
        sourceReceivedAt: row.source_received_at.toISOString(),
        recordedAt: row.recorded_at.toISOString()
      },
      position: {
        sourceReceivedAt: row.source_received_at.toISOString(),
        id: row.id
      }
    }));
  }
}
