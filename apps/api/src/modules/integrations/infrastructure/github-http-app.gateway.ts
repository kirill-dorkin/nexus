import {
  BadGatewayException,
  ForbiddenException,
  Injectable,
  ServiceUnavailableException
} from "@nestjs/common";

import { GitHubAppGateway } from "../application/github-app.gateway";
import type {
  GitHubRepositorySnapshot,
  VerifiedGitHubInstallation
} from "../application/github-app-setup.repository";

const githubApiVersion = "2026-03-10";
const pageSize = 100;

type JsonObject = Record<string, unknown>;

function requireEnv(name: string): string {
  const value = process.env[name];
  if (value === undefined || value.trim().length === 0) {
    throw new ServiceUnavailableException(`${name} is required for GitHub App setup.`);
  }
  return value.trim();
}

function requireObject(value: unknown, field: string): JsonObject {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new BadGatewayException(`GitHub returned an invalid ${field}.`);
  }
  return value as JsonObject;
}

function requirePositiveSafeInteger(value: unknown, field: string): string {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value <= 0) {
    throw new BadGatewayException(`GitHub returned an invalid ${field}.`);
  }
  return String(value);
}

function requireString(value: unknown, field: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new BadGatewayException(`GitHub returned an invalid ${field}.`);
  }
  return value;
}

function permissionAllowsRead(value: unknown): boolean {
  return value === "read" || value === "write";
}

@Injectable()
export class GitHubHttpAppGateway extends GitHubAppGateway {
  buildInstallationUrl(state: string): string {
    const slug = requireEnv("GITHUB_APP_SLUG");
    return `https://github.com/apps/${encodeURIComponent(slug)}/installations/new?state=${encodeURIComponent(state)}`;
  }

  buildUserAuthorizationUrl(state: string): string {
    const clientId = requireEnv("GITHUB_APP_CLIENT_ID");
    const redirectUri = requireEnv("GITHUB_APP_OAUTH_CALLBACK_URL");
    const query = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      state
    });
    return `https://github.com/login/oauth/authorize?${query.toString()}`;
  }

  async verifyUserInstallationAccess(
    authorizationCode: string,
    githubInstallationId: string
  ): Promise<VerifiedGitHubInstallation> {
    const accessToken = await this.exchangeAuthorizationCode(authorizationCode);
    const installation = await this.findAccessibleInstallation(
      accessToken,
      githubInstallationId
    );
    const repositories = await this.listAccessibleRepositories(
      accessToken,
      githubInstallationId
    );

    return {
      githubInstallationId,
      accountId: installation.accountId,
      accountLogin: installation.accountLogin,
      accountType: installation.accountType,
      repositorySelection: installation.repositorySelection,
      repositories
    };
  }

  private async exchangeAuthorizationCode(code: string): Promise<string> {
    const clientId = requireEnv("GITHUB_APP_CLIENT_ID");
    const clientSecret = requireEnv("GITHUB_APP_CLIENT_SECRET");
    const redirectUri = requireEnv("GITHUB_APP_OAUTH_CALLBACK_URL");
    const response = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: redirectUri
      }),
      signal: AbortSignal.timeout(10_000)
    });

    if (!response.ok) {
      throw new BadGatewayException("GitHub user authorization exchange failed.");
    }

    const payload = requireObject(await response.json(), "OAuth token response");
    const accessToken = payload.access_token;
    if (typeof accessToken !== "string" || accessToken.length === 0) {
      throw new BadGatewayException("GitHub did not return a user access token.");
    }

    return accessToken;
  }

  private async findAccessibleInstallation(
    accessToken: string,
    githubInstallationId: string
  ): Promise<Readonly<{
    accountId: string;
    accountLogin: string;
    accountType: string;
    repositorySelection: "all" | "selected";
  }>> {
    const expectedAppId = requirePositiveDecimalEnv("GITHUB_APP_ID");

    for (let page = 1; page <= 100; page += 1) {
      const payload = await this.githubGet(
        `https://api.github.com/user/installations?per_page=${pageSize}&page=${page}`,
        accessToken
      );
      const installations = payload.installations;
      if (!Array.isArray(installations)) {
        throw new BadGatewayException("GitHub returned an invalid installations response.");
      }

      for (const candidate of installations) {
        const object = requireObject(candidate, "installation");
        const candidateId = requirePositiveSafeInteger(object.id, "installation.id");
        if (candidateId !== githubInstallationId) continue;

        const appId = requirePositiveSafeInteger(object.app_id, "installation.app_id");
        if (appId !== expectedAppId) {
          throw new ForbiddenException("The GitHub installation belongs to another app.");
        }

        const permissions = requireObject(object.permissions, "installation.permissions");
        if (
          !permissionAllowsRead(permissions.pull_requests) ||
          !permissionAllowsRead(permissions.checks)
        ) {
          throw new ForbiddenException(
            "The GitHub installation does not grant the required read permissions."
          );
        }

        const account = requireObject(object.account, "installation.account");
        const selection = object.repository_selection;
        if (selection !== "all" && selection !== "selected") {
          throw new BadGatewayException(
            "GitHub returned an invalid installation.repository_selection."
          );
        }

        return {
          accountId: requirePositiveSafeInteger(account.id, "installation.account.id"),
          accountLogin: requireString(account.login, "installation.account.login"),
          accountType: requireString(account.type, "installation.account.type"),
          repositorySelection: selection
        };
      }

      if (installations.length < pageSize) break;
    }

    throw new ForbiddenException(
      "The authenticated GitHub user cannot access this GitHub App installation."
    );
  }

  private async listAccessibleRepositories(
    accessToken: string,
    githubInstallationId: string
  ): Promise<readonly GitHubRepositorySnapshot[]> {
    const repositories: GitHubRepositorySnapshot[] = [];

    for (let page = 1; page <= 100; page += 1) {
      const payload = await this.githubGet(
        `https://api.github.com/user/installations/${encodeURIComponent(githubInstallationId)}/repositories?per_page=${pageSize}&page=${page}`,
        accessToken
      );
      const pageRepositories = payload.repositories;
      if (!Array.isArray(pageRepositories)) {
        throw new BadGatewayException("GitHub returned an invalid repositories response.");
      }

      for (const candidate of pageRepositories) {
        const repository = requireObject(candidate, "repository");
        repositories.push({
          githubRepositoryId: requirePositiveSafeInteger(repository.id, "repository.id"),
          fullName: requireString(repository.full_name, "repository.full_name")
        });
      }

      if (pageRepositories.length < pageSize) break;
    }

    return repositories;
  }

  private async githubGet(url: string, accessToken: string): Promise<JsonObject> {
    const response = await fetch(url, {
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${accessToken}`,
        "X-GitHub-Api-Version": githubApiVersion
      },
      signal: AbortSignal.timeout(10_000)
    });

    if (!response.ok) {
      if (response.status === 401 || response.status === 403 || response.status === 404) {
        throw new ForbiddenException("GitHub did not authorize access to the requested installation.");
      }
      throw new BadGatewayException("GitHub installation verification failed.");
    }

    return requireObject(await response.json(), "API response");
  }
}

function requirePositiveDecimalEnv(name: string): string {
  const value = requireEnv(name);
  if (!/^[1-9][0-9]*$/.test(value)) {
    throw new ServiceUnavailableException(`${name} must be a positive decimal integer.`);
  }
  return value;
}
