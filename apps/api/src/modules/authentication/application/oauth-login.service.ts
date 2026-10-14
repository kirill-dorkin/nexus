import { Injectable, UnauthorizedException } from "@nestjs/common";
import type { IdentityUser, OAuthProvider, OAuthProvidersResponse } from "@platform/contracts";
import type { DatabaseTransaction } from "@platform/database";

import { DatabaseService } from "../../../database/database.service";
import { optionalConfiguredWebOrigin } from "../../../http/web-app-origin";
import { IdentityApplicationService } from "../../identity/application/identity.service";
import { AuthenticationRepository } from "./authentication.repository";
import { OAuthProviderGateway, type OAuthIdentityProfile } from "./oauth-provider.gateway";
import { createCodeChallenge, createCodeVerifier, createOAuthState, sha256Hex } from "../domain/oauth-state";
import { safeOAuthReturnTo } from "../domain/oauth-return-to";
import { createSessionToken, hashSessionToken, isSessionToken } from "../domain/session-token";

const STATE_TTL_MS = 10 * 60 * 1000;
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export class OAuthCallbackFailure extends Error {
  constructor(readonly returnTo: string) {
    super("External login could not be completed.");
    this.name = "OAuthCallbackFailure";
  }
}

export type OAuthCompletion = Readonly<{
  user: IdentityUser;
  sessionToken: string;
  returnTo: string;
}>;

@Injectable()
export class OAuthLoginService {
  constructor(
    private readonly database: DatabaseService,
    private readonly identity: IdentityApplicationService,
    private readonly authentication: AuthenticationRepository,
    private readonly providers: OAuthProviderGateway
  ) {}

  configuredProviders(): OAuthProvidersResponse {
    return { providers: [...this.providers.configuredProviders()] };
  }

  async start(provider: OAuthProvider, returnTo: unknown): Promise<string> {
    if (!this.providers.configuredProviders().includes(provider)) {
      throw new UnauthorizedException("External login provider is unavailable.");
    }
    const state = createOAuthState();
    const verifier = createCodeVerifier();
    await this.database.transaction((transaction) =>
      this.authentication.createOAuthLoginState(transaction, {
        stateHash: sha256Hex(state),
        provider,
        codeVerifier: verifier,
        returnTo: safeOAuthReturnTo(returnTo),
        expiresAt: new Date(Date.now() + STATE_TTL_MS)
      })
    );
    return this.providers.authorizationUrl({
      provider,
      state,
      codeChallenge: createCodeChallenge(verifier)
    });
  }

  async complete(input: Readonly<{
    provider: OAuthProvider;
    state: string | undefined;
    code: string | undefined;
    providerError: string | undefined;
    currentSessionToken: string | null;
  }>): Promise<OAuthCompletion> {
    if (input.state === undefined || input.state.length > 256) {
      throw new OAuthCallbackFailure("/me/learning");
    }
    const loginState = await this.database.transaction((transaction) =>
      this.authentication.consumeOAuthLoginState(
        transaction,
        input.provider,
        sha256Hex(input.state as string)
      )
    );
    if (loginState === null) throw new OAuthCallbackFailure("/me/learning");
    if (input.providerError !== undefined || input.code === undefined || input.code.length > 512) {
      throw new OAuthCallbackFailure(loginState.returnTo);
    }

    let profile: OAuthIdentityProfile;
    try {
      profile = await this.providers.exchangeCode({
        provider: input.provider,
        code: input.code,
        codeVerifier: loginState.codeVerifier
      });
    } catch {
      throw new OAuthCallbackFailure(loginState.returnTo);
    }

    const sessionToken = createSessionToken();
    const candidateId = await this.database.nextUuid();
    try {
      const user = await this.database.transaction((transaction) =>
        this.resolveAndStartSession(
          transaction,
          input.provider,
          profile,
          candidateId,
          hashSessionToken(sessionToken),
          input.currentSessionToken
        )
      );
      return { user, sessionToken, returnTo: loginState.returnTo };
    } catch (error) {
      if (!isUniqueViolation(error)) throw error;
      const user = await this.database.transaction(async (transaction) => {
        const userId = await this.authentication.findExternalIdentityUserId(
          transaction, input.provider, profile.subject
        );
        const existing = userId === null
          ? await this.identity.findByEmail(transaction, profile.email)
          : await this.identity.findActiveUser(transaction, userId);
        if (existing === null || existing.status !== "active") {
          throw new OAuthCallbackFailure(loginState.returnTo);
        }
        if (userId === null) {
          await this.authentication.createExternalIdentity(
            transaction, input.provider, profile.subject, existing.id
          );
        }
        await this.startSession(
          transaction, existing.id, hashSessionToken(sessionToken), input.currentSessionToken
        );
        return existing;
      });
      return { user, sessionToken, returnTo: loginState.returnTo };
    }
  }

  destination(returnTo: string): string {
    const origin = optionalConfiguredWebOrigin();
    if (origin === null) throw new OAuthCallbackFailure(returnTo);
    return `${origin}${safeOAuthReturnTo(returnTo)}`;
  }

  private async resolveAndStartSession(
    transaction: DatabaseTransaction,
    provider: OAuthProvider,
    profile: OAuthIdentityProfile,
    candidateId: string,
    tokenHash: string,
    currentSessionToken: string | null
  ): Promise<IdentityUser> {
    const linkedUserId = await this.authentication.findExternalIdentityUserId(
      transaction, provider, profile.subject
    );
    let user = linkedUserId === null
      ? await this.identity.findByEmail(transaction, profile.email)
      : await this.identity.findActiveUser(transaction, linkedUserId);
    if (linkedUserId !== null && user === null) {
      throw new UnauthorizedException("An active account is required.");
    }
    if (user === null) {
      user = await this.identity.createUser(transaction, {
        id: candidateId,
        email: profile.email,
        displayName: profile.displayName
      });
    }
    if (user.status !== "active") {
      throw new UnauthorizedException("An active account is required.");
    }
    if (linkedUserId === null) {
      await this.authentication.createExternalIdentity(
        transaction, provider, profile.subject, user.id
      );
    } else {
      await this.authentication.touchExternalIdentity(transaction, provider, profile.subject);
    }
    await this.startSession(transaction, user.id, tokenHash, currentSessionToken);
    return user;
  }

  private async startSession(
    transaction: DatabaseTransaction,
    userId: string,
    tokenHash: string,
    currentSessionToken: string | null
  ): Promise<void> {
    if (currentSessionToken !== null && isSessionToken(currentSessionToken)) {
      await this.authentication.revokeSessionByTokenHash(
        transaction, hashSessionToken(currentSessionToken)
      );
    }
    await this.authentication.createSession(transaction, {
      userId,
      tokenHash,
      expiresAt: new Date(Date.now() + SESSION_TTL_MS)
    });
  }
}

function isUniqueViolation(error: unknown): boolean {
  return typeof error === "object" && error !== null &&
    (error as { code?: unknown }).code === "23505";
}
