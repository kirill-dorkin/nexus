import type { DatabaseTransaction } from "@platform/database";

export type ProjectTeamRecord = Readonly<{
  id: string;
  organizationId: string;
  name: string;
  status: "active" | "archived";
  createdAt: Date;
}>;

export type ProjectTeamMemberRecord = Readonly<{
  userId: string;
  joinedAt: Date;
}>;

export type ProjectRecord = Readonly<{
  id: string;
  organizationId: string;
  teamId: string;
  name: string;
  status: "active" | "archived";
  createdAt: Date;
}>;

export type ProjectRepositoryBindingRecord = Readonly<{
  id: string;
  organizationId: string;
  projectId: string;
  repositoryMappingId: string;
  connectedAt: Date;
}>;

export abstract class ProjectsRepository {
  abstract createTeam(
    transaction: DatabaseTransaction,
    input: Readonly<{
      id: string;
      organizationId: string;
      name: string;
      createdByUserId: string;
    }>
  ): Promise<ProjectTeamRecord>;

  abstract addTeamMember(
    transaction: DatabaseTransaction,
    input: Readonly<{
      organizationId: string;
      teamId: string;
      userId: string;
      addedByUserId: string;
    }>
  ): Promise<void>;

  abstract findTeam(
    transaction: DatabaseTransaction,
    organizationId: string,
    teamId: string
  ): Promise<ProjectTeamRecord | null>;

  abstract listActiveTeamMembers(
    transaction: DatabaseTransaction,
    organizationId: string,
    teamId: string
  ): Promise<readonly ProjectTeamMemberRecord[]>;

  abstract createProject(
    transaction: DatabaseTransaction,
    input: Readonly<{
      id: string;
      organizationId: string;
      teamId: string;
      name: string;
      createdByUserId: string;
    }>
  ): Promise<ProjectRecord>;

  abstract findProject(
    transaction: DatabaseTransaction,
    organizationId: string,
    projectId: string
  ): Promise<ProjectRecord | null>;

  abstract findActiveRepositoryBindingForProject(
    transaction: DatabaseTransaction,
    organizationId: string,
    projectId: string
  ): Promise<ProjectRepositoryBindingRecord | null>;

  abstract findActiveRepositoryBindingByMapping(
    transaction: DatabaseTransaction,
    organizationId: string,
    repositoryMappingId: string
  ): Promise<ProjectRepositoryBindingRecord | null>;

  abstract createRepositoryBinding(
    transaction: DatabaseTransaction,
    input: Readonly<{
      id: string;
      organizationId: string;
      projectId: string;
      repositoryMappingId: string;
      connectedByUserId: string;
    }>
  ): Promise<ProjectRepositoryBindingRecord>;

  abstract disconnectRepositoryBinding(
    transaction: DatabaseTransaction,
    input: Readonly<{
      organizationId: string;
      bindingId: string;
      disconnectedByUserId: string;
    }>
  ): Promise<boolean>;
}
