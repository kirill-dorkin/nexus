import type { Project } from "@platform/contracts";
import type { GitHubRepositoryReference } from "../../integrations/application/github-repository-reference.query";
import type {
  ProjectRecord,
  ProjectRepositoryBindingRecord
} from "./projects.repository";

export function connectedProjectView(
  project: ProjectRecord,
  binding: ProjectRepositoryBindingRecord,
  reference: GitHubRepositoryReference
): Project {
  return {
    id: project.id,
    name: project.name,
    status: project.status,
    teamId: project.teamId,
    repository: {
      bindingId: binding.id,
      repositoryMappingId: reference.repositoryMappingId,
      githubRepositoryId: reference.githubRepositoryId,
      fullName: reference.fullName,
      availability: reference.availability,
      connectedAt: binding.connectedAt.toISOString()
    },
    createdAt: project.createdAt.toISOString()
  };
}

export function disconnectedProjectView(project: ProjectRecord): Project {
  return {
    id: project.id,
    name: project.name,
    status: project.status,
    teamId: project.teamId,
    repository: null,
    createdAt: project.createdAt.toISOString()
  };
}
