import { Injectable } from "@nestjs/common";
import type { DatabaseTransaction } from "@platform/database";

import {
  ProjectsRepository,
  type ProjectRecord,
  type ProjectRepositoryBindingRecord,
  type ProjectTeamMemberRecord,
  type ProjectTeamRecord
} from "../application/projects.repository";

type TeamRow = {
  id: string;
  organization_id: string;
  name: string;
  status: "active" | "archived";
  created_at: Date;
};

type TeamMemberRow = {
  user_id: string;
  joined_at: Date;
};

type ProjectRow = {
  id: string;
  organization_id: string;
  team_id: string;
  name: string;
  status: "active" | "archived";
  created_at: Date;
};

type BindingRow = {
  id: string;
  organization_id: string;
  project_id: string;
  github_repository_mapping_id: string;
  connected_at: Date;
};

function mapTeam(row: TeamRow): ProjectTeamRecord {
  return {
    id: row.id,
    organizationId: row.organization_id,
    name: row.name,
    status: row.status,
    createdAt: row.created_at
  };
}

function mapProject(row: ProjectRow): ProjectRecord {
  return {
    id: row.id,
    organizationId: row.organization_id,
    teamId: row.team_id,
    name: row.name,
    status: row.status,
    createdAt: row.created_at
  };
}

function mapBinding(row: BindingRow): ProjectRepositoryBindingRecord {
  return {
    id: row.id,
    organizationId: row.organization_id,
    projectId: row.project_id,
    repositoryMappingId: row.github_repository_mapping_id,
    connectedAt: row.connected_at
  };
}

@Injectable()
export class PostgresProjectsRepository extends ProjectsRepository {
  async createTeam(
    transaction: DatabaseTransaction,
    input: Parameters<ProjectsRepository["createTeam"]>[1]
  ): Promise<ProjectTeamRecord> {
    const result = await transaction.client.query<TeamRow>(
      `INSERT INTO projects.teams (
         id, organization_id, name, created_by_user_id
       ) VALUES ($1, $2, $3, $4)
       RETURNING id::text, organization_id::text, name, status, created_at`,
      [input.id, input.organizationId, input.name, input.createdByUserId]
    );
    const row = result.rows[0];
    if (row === undefined) throw new Error("Project team insert returned no row.");
    return mapTeam(row);
  }

  async addTeamMember(
    transaction: DatabaseTransaction,
    input: Parameters<ProjectsRepository["addTeamMember"]>[1]
  ): Promise<void> {
    await transaction.client.query(
      `INSERT INTO projects.team_memberships (
         organization_id, team_id, user_id, added_by_user_id
       ) VALUES ($1, $2, $3, $4)`,
      [input.organizationId, input.teamId, input.userId, input.addedByUserId]
    );
  }

  async findTeam(
    transaction: DatabaseTransaction,
    organizationId: string,
    teamId: string
  ): Promise<ProjectTeamRecord | null> {
    const result = await transaction.client.query<TeamRow>(
      `SELECT id::text, organization_id::text, name, status, created_at
       FROM projects.teams
       WHERE organization_id = $1 AND id = $2`,
      [organizationId, teamId]
    );
    const row = result.rows[0];
    return row === undefined ? null : mapTeam(row);
  }

  async listActiveTeamMembers(
    transaction: DatabaseTransaction,
    organizationId: string,
    teamId: string
  ): Promise<readonly ProjectTeamMemberRecord[]> {
    const result = await transaction.client.query<TeamMemberRow>(
      `SELECT user_id::text, joined_at
       FROM projects.team_memberships
       WHERE organization_id = $1
         AND team_id = $2
         AND removed_at IS NULL
       ORDER BY joined_at, id`,
      [organizationId, teamId]
    );
    return result.rows.map((row) => ({
      userId: row.user_id,
      joinedAt: row.joined_at
    }));
  }

  async createProject(
    transaction: DatabaseTransaction,
    input: Parameters<ProjectsRepository["createProject"]>[1]
  ): Promise<ProjectRecord> {
    const result = await transaction.client.query<ProjectRow>(
      `INSERT INTO projects.projects (
         id, organization_id, team_id, name, created_by_user_id
       ) VALUES ($1, $2, $3, $4, $5)
       RETURNING id::text, organization_id::text, team_id::text, name, status, created_at`,
      [
        input.id,
        input.organizationId,
        input.teamId,
        input.name,
        input.createdByUserId
      ]
    );
    const row = result.rows[0];
    if (row === undefined) throw new Error("Project insert returned no row.");
    return mapProject(row);
  }

  async findProject(
    transaction: DatabaseTransaction,
    organizationId: string,
    projectId: string
  ): Promise<ProjectRecord | null> {
    const result = await transaction.client.query<ProjectRow>(
      `SELECT id::text, organization_id::text, team_id::text, name, status, created_at
       FROM projects.projects
       WHERE organization_id = $1 AND id = $2`,
      [organizationId, projectId]
    );
    const row = result.rows[0];
    return row === undefined ? null : mapProject(row);
  }

  async findActiveRepositoryBindingForProject(
    transaction: DatabaseTransaction,
    organizationId: string,
    projectId: string
  ): Promise<ProjectRepositoryBindingRecord | null> {
    const result = await transaction.client.query<BindingRow>(
      `SELECT
         id::text,
         organization_id::text,
         project_id::text,
         github_repository_mapping_id::text,
         connected_at
       FROM projects.repository_bindings
       WHERE organization_id = $1
         AND project_id = $2
         AND disconnected_at IS NULL`,
      [organizationId, projectId]
    );
    const row = result.rows[0];
    return row === undefined ? null : mapBinding(row);
  }

  async findActiveRepositoryBindingByMapping(
    transaction: DatabaseTransaction,
    organizationId: string,
    repositoryMappingId: string
  ): Promise<ProjectRepositoryBindingRecord | null> {
    const result = await transaction.client.query<BindingRow>(
      `SELECT
         id::text,
         organization_id::text,
         project_id::text,
         github_repository_mapping_id::text,
         connected_at
       FROM projects.repository_bindings
       WHERE organization_id = $1
         AND github_repository_mapping_id = $2
         AND disconnected_at IS NULL`,
      [organizationId, repositoryMappingId]
    );
    const row = result.rows[0];
    return row === undefined ? null : mapBinding(row);
  }

  async createRepositoryBinding(
    transaction: DatabaseTransaction,
    input: Parameters<ProjectsRepository["createRepositoryBinding"]>[1]
  ): Promise<ProjectRepositoryBindingRecord | null> {
    const result = await transaction.client.query<BindingRow>(
      `INSERT INTO projects.repository_bindings (
         id,
         organization_id,
         project_id,
         github_repository_mapping_id,
         connected_by_user_id
       ) VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT DO NOTHING
       RETURNING
         id::text,
         organization_id::text,
         project_id::text,
         github_repository_mapping_id::text,
         connected_at`,
      [
        input.id,
        input.organizationId,
        input.projectId,
        input.repositoryMappingId,
        input.connectedByUserId
      ]
    );
    const row = result.rows[0];
    return row === undefined ? null : mapBinding(row);
  }

  async disconnectRepositoryBinding(
    transaction: DatabaseTransaction,
    input: Parameters<ProjectsRepository["disconnectRepositoryBinding"]>[1]
  ): Promise<boolean> {
    const result = await transaction.client.query<{ id: string }>(
      `UPDATE projects.repository_bindings
       SET disconnected_by_user_id = $3,
           disconnected_at = now()
       WHERE organization_id = $1
         AND id = $2
         AND disconnected_at IS NULL
       RETURNING id::text`,
      [input.organizationId, input.bindingId, input.disconnectedByUserId]
    );
    return result.rows[0] !== undefined;
  }
}
