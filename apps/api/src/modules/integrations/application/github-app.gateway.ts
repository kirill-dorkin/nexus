import type { VerifiedGitHubInstallation } from "./github-app-setup.repository";

export abstract class GitHubAppGateway {
  abstract buildInstallationUrl(state: string): string;
  abstract buildUserAuthorizationUrl(state: string): string;
  abstract verifyUserInstallationAccess(
    authorizationCode: string,
    githubInstallationId: string
  ): Promise<VerifiedGitHubInstallation>;
}
