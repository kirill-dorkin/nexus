import { Injectable } from "@nestjs/common";
import type { GitHubInstallationMapping } from "@platform/contracts";
import type { DatabaseTransaction } from "@platform/database";

import {
  GitHubAppSetupRepository,
  GitHubIntegrationOwnershipConflictError,
  type GitHubOAuthCallbackContext,
  type GitHubSetupCallbackContext
} from "../application/github-app-setup.repository";

type InstallationRow = {
  id: string;
  organization_id: string;
  github_installation_id: string;
  status: "active" | "suspended" | "removed";
  github_account_id: string | null;
  github_account_login: string | null;
  github_account_type: string | null;
  repository_selection: "all" | "selected" | null;
  last_synced_at: Date | null;
};

type RepositoryRow = {
  id: string;
  organization_id: string;
  github_installation_id: string;
  github_repository_id: string;
  full_name: string;
  status: "active" | "removed";
};

type SetupCallbackRow = {
  setup_session_id: string;
  organization_id: string;
};

type OAuthCallbackRow = SetupCallbackRow & {
  github_installation_id: string;
};

const installationSelect = `
  id::text,
  organization_id::text,
  github_installation_id::text,
  status,
  github_account_id::text,
  github_account_login,
  github_account_type,
  repository_selection,
  last_synced_at
`;

const repositorySelect = `
  id::text,
  organization_id::text,
  github_installation_id::text,
  github_repository_id::text,
  full_name,
  status
`;

@Injectable()
export class PostgresGitHubAppSetupRepository extends GitHubAppSetupRepository {
  async createSetupSession(
    transaction: DatabaseTransaction,
    input: Readonly<{
      id: string;
      organizationId: string;
      initiatedByUserId: string;
      installationStateSha256: string;
      expiresAt: Date;
    }>
  ): Promise<void> {
    await transaction.client.query(
      `INSERT INTO integrations.github_setup_sessions (
         id,
         organization_id,
         initiated_by_user_id,
         installation_state_sha256,
         expires_at
       ) VALUES ($1, $2, $3, $4, $5)`,
      [
        input.id,
        input.organizationId,
        input.initiatedByUserId,
        input.installationStateSha256,
        input.expiresAt
      ]
    );
  }

  async advanceToOAuth(
    transaction: DatabaseTransaction,
    input: Readonly<{
      installationStateSha256: string;
      userId: string;
      githubInstallationId: string;
      oauthStateSha256: string;
    }>
  ): Promise<GitHubSetupCallbackContext | null> {
    const result = await transaction.client.query<SetupCallbackRow>(
      `SELECT setup_session_id::text, organization_id::text
         FROM platform_internal.advance_github_setup_to_oauth($1, $2, $3, $4)`,
      [
        input.installationStateSha256,
        input.userId,
        input.githubInstallationId,
        input.oauthStateSha256
      ]
    );
    const row = result.rows[0];
    return row === undefined
      ? null
      : {
          setupSessionId: row.setup_session_id,
          organizationId: row.organization_id
        };
  }

  async consumeOAuthState(
    transaction: DatabaseTransaction,
    input: Readonly<{
      oauthStateSha256: string;
      userId: string;
    }>
  ): Promise<GitHubOAuthCallbackContext | null> {
    const result = await transaction.client.query<OAuthCallbackRow>(
      `SELECT setup_session_id::text, organization_id::text, github_installation_id::text
         FROM platform_internal.consume_github_setup_oauth_state($1, $2)`,
      [input.oauthStateSha256, input.userId]
    );
    const row = result.rows[0];
    return row === undefined
      ? null
      : {
          setupSessionId: row.setup_session_id,
          organizationId: row.organization_id,
          githubInstallationId: row.github_installation_id
        };
  }

  async completeSetup(
    transaction: DatabaseTransaction,
    input: Parameters<GitHubAppSetupRepository["completeSetup"]>[1]
  ): Promise<GitHubInstallationMapping> {
    const installationResult = await transaction.client.query<InstallationRow>(
      `INSERT INTO integrations.github_installations (
         organization_id,
         github_installation_id,
         status,
         github_account_id,
         github_account_login,
         github_account_type,
         repository_selection,
         linked_by_user_id,
         last_synced_at
       ) VALUES ($1, $2, 'active', $3, $4, $5, $6, $7, $8)
       ON CONFLICT (github_installation_id) DO UPDATE
       SET status = 'active',
           github_account_id = EXCLUDED.github_account_id,
           github_account_login = EXCLUDED.github_account_login,
           github_account_type = EXCLUDED.github_account_type,
           repository_selection = EXCLUDED.repository_selection,
           linked_by_user_id = EXCLUDED.linked_by_user_id,
           last_synced_at = EXCLUDED.last_synced_at,
           updated_at = EXCLUDED.last_synced_at
       WHERE integrations.github_installations.organization_id = EXCLUDED.organization_id
       RETURNING ${installationSelect}`,
      [
        input.organizationId,
        input.installation.githubInstallationId,
        input.installation.accountId,
        input.installation.accountLogin,
        input.installation.accountType,
        input.installation.repositorySelection,
        input.linkedByUserId,
        input.syncedAt
      ]
    );
    const installationRow = installationResult.rows[0];
    if (installationRow === undefined) {
      throw new GitHubIntegrationOwnershipConflictError(
        "The GitHub installation is already mapped to another organization."
      );
    }

    await transaction.client.query(
      `UPDATE integrations.github_repositories
       SET status = 'removed', updated_at = $3
       WHERE organization_id = $1
         AND github_installation_id = $2
         AND status <> 'removed'`,
      [input.organizationId, input.installation.githubInstallationId, input.syncedAt]
    );

    for (const repository of input.installation.repositories) {
      const repositoryResult = await transaction.client.query<RepositoryRow>(
        `INSERT INTO integrations.github_repositories (
           organization_id,
           github_installation_id,
           github_repository_id,
           full_name,
           status
         ) VALUES ($1, $2, $3, $4, 'active')
         ON CONFLICT (github_repository_id) DO UPDATE
         SET full_name = EXCLUDED.full_name,
             status = 'active',
             updated_at = $5
         WHERE integrations.github_repositories.organization_id = EXCLUDED.organization_id
           AND integrations.github_repositories.github_installation_id = EXCLUDED.github_installation_id
         RETURNING ${repositorySelect}`,
        [
          input.organizationId,
          input.installation.githubInstallationId,
          repository.githubRepositoryId,
          repository.fullName,
          input.syncedAt
        ]
      );
      if (repositoryResult.rows[0] === undefined) {
        throw new GitHubIntegrationOwnershipConflictError(
          `GitHub repository ${repository.githubRepositoryId} is already mapped to another organization or installation.`
        );
      }
    }

    const completed = await transaction.client.query<{ id: string }>(
      `UPDATE integrations.github_setup_sessions
       SET completed_at = $4, updated_at = $4
       WHERE id = $1
         AND organization_id = $2
         AND initiated_by_user_id = $3
         AND oauth_state_consumed_at IS NOT NULL
         AND completed_at IS NULL
       RETURNING id::text`,
      [
        input.setupSessionId,
        input.organizationId,
        input.linkedByUserId,
        input.syncedAt
      ]
    );
    if (completed.rows[0] === undefined) {
      throw new Error("GitHub setup session could not be completed.");
    }

    const installation = await this.findInstallationById(
      transaction,
      input.organizationId,
      installationRow.id
    );
    if (installation === null) {
      throw new Error("GitHub installation mapping disappeared during setup completion.");
    }
    return installation;
  }

  async listInstallations(
    transaction: DatabaseTransaction,
    organizationId: string
  ): Promise<readonly GitHubInstallationMapping[]> {
    const installationResult = await transaction.client.query<InstallationRow>(
      `SELECT ${installationSelect}
       FROM integrations.github_installations
       WHERE organization_id = $1
       ORDER BY created_at, id`,
      [organizationId]
    );
    const repositoryResult = await transaction.client.query<RepositoryRow>(
      `SELECT ${repositorySelect}
       FROM integrations.github_repositories
       WHERE organization_id = $1
       ORDER BY github_installation_id, full_name, id`,
      [organizationId]
    );

    return installationResult.rows.map((installation) =>
      mapInstallation(
        installation,
        repositoryResult.rows.filter(
          (repository) =>
            repository.github_installation_id === installation.github_installation_id
        )
      )
    );
  }

  async suspendInstallation(
    transaction: DatabaseTransaction,
    input: Readonly<{
      organizationId: string;
      installationMappingId: string;
    }>
  ): Promise<GitHubInstallationMapping | null> {
    const updated = await transaction.client.query<{ id: string }>(
      `UPDATE integrations.github_installations
       SET status = 'suspended', updated_at = now()
       WHERE id = $1 AND organization_id = $2 AND status <> 'removed'
       RETURNING id::text`,
      [input.installationMappingId, input.organizationId]
    );
    if (updated.rows[0] === undefined) return null;

    await transaction.client.query(
      `UPDATE integrations.github_repositories
       SET status = 'removed', updated_at = now()
       WHERE organization_id = $1
         AND github_installation_id = (
           SELECT github_installation_id
           FROM integrations.github_installations
           WHERE id = $2 AND organization_id = $1
         )
         AND status <> 'removed'`,
      [input.organizationId, input.installationMappingId]
    );

    return this.findInstallationById(
      transaction,
      input.organizationId,
      input.installationMappingId
    );
  }

  private async findInstallationById(
    transaction: DatabaseTransaction,
    organizationId: string,
    installationMappingId: string
  ): Promise<GitHubInstallationMapping | null> {
    const installationResult = await transaction.client.query<InstallationRow>(
      `SELECT ${installationSelect}
       FROM integrations.github_installations
       WHERE organization_id = $1 AND id = $2`,
      [organizationId, installationMappingId]
    );
    const installation = installationResult.rows[0];
    if (installation === undefined) return null;

    const repositoryResult = await transaction.client.query<RepositoryRow>(
      `SELECT ${repositorySelect}
       FROM integrations.github_repositories
       WHERE organization_id = $1 AND github_installation_id = $2
       ORDER BY full_name, id`,
      [organizationId, installation.github_installation_id]
    );
    return mapInstallation(installation, repositoryResult.rows);
  }
}

function mapInstallation(
  installation: InstallationRow,
  repositories: readonly RepositoryRow[]
): GitHubInstallationMapping {
  const account =
    installation.github_account_id === null ||
    installation.github_account_login === null ||
    installation.github_account_type === null
      ? null
      : {
          id: installation.github_account_id,
          login: installation.github_account_login,
          type: installation.github_account_type
        };

  return {
    id: installation.id,
    githubInstallationId: installation.github_installation_id,
    status: installation.status,
    account,
    repositorySelection: installation.repository_selection,
    lastSyncedAt: installation.last_synced_at?.toISOString() ?? null,
    repositories: repositories.map((repository) => ({
      id: repository.id,
      githubRepositoryId: repository.github_repository_id,
      fullName: repository.full_name,
      status: repository.status
    }))
  };
}
