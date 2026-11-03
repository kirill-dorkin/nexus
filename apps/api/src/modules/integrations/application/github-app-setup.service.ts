import { createHash, randomBytes } from "node:crypto";

import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import type {
  GitHubInstallationMapping,
  GitHubIntegrationSetupSession,
  GitHubIntegrationView
} from "@platform/contracts";

import { DatabaseService } from "../../../database/database.service";
import { RequestContextService } from "../../../request-context/request-context.service";
import { AuthorizationApplicationService } from "../../authorization/application/authorization.service";
import { IdentityApplicationService } from "../../identity/application/identity.service";
import { GitHubAppGateway } from "./github-app.gateway";
import {
  GitHubAppSetupRepository,
  GitHubIntegrationOwnershipConflictError
} from "./github-app-setup.repository";

const setupLifetimeMs = 10 * 60 * 1000;
const opaqueStatePattern = /^[A-Za-z0-9_-]{43}$/;
const positiveDecimalPattern = /^[1-9][0-9]*$/;

function organizationScope(organizationId: string) {
  return {
    organizationId,
    type: "organization" as const,
    id: organizationId
  };
}

function createOpaqueState(): string {
  return randomBytes(32).toString("base64url");
}

function hashState(state: string): string {
  return createHash("sha256").update(state, "utf8").digest("hex");
}

function requireOpaqueState(value: string | undefined): string {
  if (value === undefined || !opaqueStatePattern.test(value)) {
    throw new BadRequestException("Invalid or missing GitHub setup state.");
  }
  return value;
}

function requirePositiveDecimal(
  value: string | undefined,
  field: string
): string {
  if (value === undefined || !positiveDecimalPattern.test(value)) {
    throw new BadRequestException(
      `${field} must be a positive decimal integer.`
    );
  }
  return value;
}

@Injectable()
export class GitHubAppSetupApplicationService {
  constructor(
    private readonly database: DatabaseService,
    private readonly requestContext: RequestContextService,
    private readonly identity: IdentityApplicationService,
    private readonly authorization: AuthorizationApplicationService,
    private readonly setup: GitHubAppSetupRepository,
    private readonly github: GitHubAppGateway
  ) {}

  async initiateSetup(
    organizationId: string
  ): Promise<GitHubIntegrationSetupSession> {
    const context = this.requestContext.tenantContext(organizationId);
    const state = createOpaqueState();
    const expiresAt = new Date(Date.now() + setupLifetimeMs);
    const sessionId = await this.database.nextUuid();

    await this.database.tenantTransaction(context, async (transaction) => {
      await this.identity.requireActiveUser(transaction, context.userId);
      await this.authorization.requireCapability(
        transaction,
        context.userId,
        "integration.manage",
        organizationScope(organizationId)
      );
      await this.setup.createSetupSession(transaction, {
        id: sessionId,
        organizationId,
        initiatedByUserId: context.userId,
        installationStateSha256: hashState(state),
        expiresAt
      });
    });

    return {
      installationUrl: this.github.buildInstallationUrl(state),
      expiresAt: expiresAt.toISOString()
    };
  }

  async handleInstallationReturn(
    input: Readonly<{
      state: string | undefined;
      installationId: string | undefined;
      setupAction: string | undefined;
    }>
  ): Promise<string> {
    const principal = this.requestContext.requirePrincipal();
    const state = requireOpaqueState(input.state);
    const installationId = requirePositiveDecimal(
      input.installationId,
      "installation_id"
    );
    if (input.setupAction !== "install" && input.setupAction !== "update") {
      throw new BadRequestException("Unsupported GitHub setup_action.");
    }

    const oauthState = createOpaqueState();
    const advanced = await this.database.transaction((transaction) =>
      this.setup.advanceToOAuth(transaction, {
        installationStateSha256: hashState(state),
        userId: principal.userId,
        githubInstallationId: installationId,
        oauthStateSha256: hashState(oauthState)
      })
    );
    if (advanced === null) {
      throw new BadRequestException(
        "GitHub setup state is expired, already used, or belongs to another user."
      );
    }

    return this.github.buildUserAuthorizationUrl(oauthState);
  }

  async completeUserAuthorization(
    input: Readonly<{
      state: string | undefined;
      code: string | undefined;
    }>
  ): Promise<GitHubInstallationMapping> {
    const principal = this.requestContext.requirePrincipal();
    const state = requireOpaqueState(input.state);
    if (
      input.code === undefined ||
      input.code.length < 1 ||
      input.code.length > 2048
    ) {
      throw new BadRequestException(
        "Invalid or missing GitHub authorization code."
      );
    }

    const callbackContext = await this.database.transaction((transaction) =>
      this.setup.consumeOAuthState(transaction, {
        oauthStateSha256: hashState(state),
        userId: principal.userId
      })
    );
    if (callbackContext === null) {
      throw new BadRequestException(
        "GitHub OAuth state is expired, already used, or belongs to another user."
      );
    }

    const verifiedInstallation = await this.github.verifyUserInstallationAccess(
      input.code,
      callbackContext.githubInstallationId
    );

    try {
      return await this.database.tenantTransaction(
        {
          organizationId: callbackContext.organizationId,
          userId: principal.userId
        },
        async (transaction) => {
          await this.identity.requireActiveUser(transaction, principal.userId);
          await this.authorization.requireCapability(
            transaction,
            principal.userId,
            "integration.manage",
            organizationScope(callbackContext.organizationId)
          );
          return this.setup.completeSetup(transaction, {
            setupSessionId: callbackContext.setupSessionId,
            organizationId: callbackContext.organizationId,
            linkedByUserId: principal.userId,
            installation: verifiedInstallation,
            syncedAt: new Date()
          });
        }
      );
    } catch (error) {
      if (error instanceof GitHubIntegrationOwnershipConflictError) {
        throw new ConflictException(error.message);
      }
      throw error;
    }
  }

  async getIntegration(organizationId: string): Promise<GitHubIntegrationView> {
    const context = this.requestContext.tenantContext(organizationId);
    return this.database.tenantTransaction(context, async (transaction) => {
      await this.identity.requireActiveUser(transaction, context.userId);
      await this.authorization.requireCapability(
        transaction,
        context.userId,
        "integration.manage",
        organizationScope(organizationId)
      );
      const installations = await this.setup.listInstallations(
        transaction,
        organizationId
      );
      return { installations: [...installations] };
    });
  }

  async suspendInstallation(
    organizationId: string,
    installationMappingId: string
  ): Promise<GitHubInstallationMapping> {
    const context = this.requestContext.tenantContext(organizationId);
    return this.database.tenantTransaction(context, async (transaction) => {
      await this.identity.requireActiveUser(transaction, context.userId);
      await this.authorization.requireCapability(
        transaction,
        context.userId,
        "integration.manage",
        organizationScope(organizationId)
      );
      const installation = await this.setup.suspendInstallation(transaction, {
        organizationId,
        installationMappingId
      });
      if (installation === null) {
        throw new NotFoundException("GitHub installation mapping not found.");
      }
      return installation;
    });
  }
}
