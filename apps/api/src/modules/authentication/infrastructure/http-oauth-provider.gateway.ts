import {
  BadGatewayException,
  Injectable,
  ServiceUnavailableException
} from "@nestjs/common";
import type { OAuthProvider } from "@platform/contracts";

import {
  OAuthProviderGateway,
  type OAuthIdentityProfile
} from "../application/oauth-provider.gateway";
import {
  optionalConfiguredWebOrigin,
  parseExactHttpOrigin
} from "../../../http/web-app-origin";

type JsonObject = Record<string, unknown>;

const githubApiVersion = "2026-03-10";

function env(name: string): string | null {
  const value = process.env[name]?.trim();
  return value === undefined || value.length === 0 ? null : value;
}

function credentials(provider: OAuthProvider): Readonly<{
  clientId: string;
  clientSecret: string;
}> | null {
  const prefix = provider === "google" ? "GOOGLE_OAUTH" : "GITHUB_OAUTH";
  const clientId = env(`${prefix}_CLIENT_ID`);
  const clientSecret = env(`${prefix}_CLIENT_SECRET`);
  return clientId === null || clientSecret === null
    ? null
    : { clientId, clientSecret };
}

function object(value: unknown, description: string): JsonObject {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new BadGatewayException(`${description} returned an invalid response.`);
  }
  return value as JsonObject;
}

function nonEmptyString(value: unknown, description: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new BadGatewayException(`${description} was missing.`);
  }
  return value.trim();
}

function callbackUrl(provider: OAuthProvider): string {
  const configured = env("OAUTH_CALLBACK_ORIGIN");
  const origin = configured === null
    ? optionalConfiguredWebOrigin()
    : parseExactHttpOrigin(configured);
  if (origin === null) {
    throw new ServiceUnavailableException(
      "OAUTH_CALLBACK_ORIGIN must be an exact HTTP(S) origin."
    );
  }
  return `${origin}/v1/auth/oauth/${provider}/callback`;
}

async function json(response: Response, description: string): Promise<JsonObject> {
  if (!response.ok) {
    throw new BadGatewayException(`${description} failed.`);
  }
  return object(await response.json(), description);
}

@Injectable()
export class HttpOAuthProviderGateway extends OAuthProviderGateway {
  configuredProviders(): readonly OAuthProvider[] {
    try {
      callbackUrl("google");
    } catch {
      return [];
    }
    return (["google", "github"] as const).filter(
      (provider) => credentials(provider) !== null
    );
  }

  authorizationUrl(input: Readonly<{
    provider: OAuthProvider;
    state: string;
    codeChallenge: string;
  }>): string {
    const configured = credentials(input.provider);
    if (configured === null) {
      throw new ServiceUnavailableException(
        `${input.provider} external login is not configured.`
      );
    }

    const common = {
      client_id: configured.clientId,
      redirect_uri: callbackUrl(input.provider),
      state: input.state,
      code_challenge: input.codeChallenge,
      code_challenge_method: "S256"
    };

    if (input.provider === "google") {
      const query = new URLSearchParams({
        ...common,
        response_type: "code",
        scope: "openid email profile",
        prompt: "select_account"
      });
      return `https://accounts.google.com/o/oauth2/v2/auth?${query.toString()}`;
    }

    const query = new URLSearchParams({
      ...common,
      scope: "read:user user:email",
      prompt: "select_account"
    });
    return `https://github.com/login/oauth/authorize?${query.toString()}`;
  }

  async exchangeCode(input: Readonly<{
    provider: OAuthProvider;
    code: string;
    codeVerifier: string;
  }>): Promise<OAuthIdentityProfile> {
    const configured = credentials(input.provider);
    if (configured === null) {
      throw new ServiceUnavailableException(
        `${input.provider} external login is not configured.`
      );
    }

    const tokenUrl = input.provider === "google"
      ? "https://oauth2.googleapis.com/token"
      : "https://github.com/login/oauth/access_token";
    const token = await json(await fetch(tokenUrl, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: new URLSearchParams({
        client_id: configured.clientId,
        client_secret: configured.clientSecret,
        code: input.code,
        code_verifier: input.codeVerifier,
        redirect_uri: callbackUrl(input.provider),
        ...(input.provider === "google" ? { grant_type: "authorization_code" } : {})
      }),
      signal: AbortSignal.timeout(10_000)
    }), `${input.provider} token exchange`);
    const accessToken = nonEmptyString(token.access_token, "OAuth access token");

    return input.provider === "google"
      ? this.googleProfile(accessToken)
      : this.githubProfile(accessToken);
  }

  private async googleProfile(accessToken: string): Promise<OAuthIdentityProfile> {
    const profile = await json(await fetch(
      "https://openidconnect.googleapis.com/v1/userinfo",
      {
        headers: { Authorization: `Bearer ${accessToken}` },
        signal: AbortSignal.timeout(10_000)
      }
    ), "Google user info");
    if (profile.email_verified !== true) {
      throw new BadGatewayException("Google did not confirm the account email.");
    }
    const name = typeof profile.name === "string" ? profile.name.trim() : "";
    return {
      subject: nonEmptyString(profile.sub, "Google account subject"),
      email: nonEmptyString(profile.email, "Google account email"),
      emailVerified: true,
      displayName: name.length === 0 ? null : name.slice(0, 160)
    };
  }

  private async githubProfile(accessToken: string): Promise<OAuthIdentityProfile> {
    const headers = {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${accessToken}`,
      "X-GitHub-Api-Version": githubApiVersion
    };
    const [profile, emailsResponse] = await Promise.all([
      fetch("https://api.github.com/user", {
        headers,
        signal: AbortSignal.timeout(10_000)
      }),
      fetch("https://api.github.com/user/emails", {
        headers,
        signal: AbortSignal.timeout(10_000)
      })
    ]);
    const user = await json(profile, "GitHub user info");
    if (!emailsResponse.ok) {
      throw new BadGatewayException("GitHub verified email lookup failed.");
    }
    const emails = await emailsResponse.json() as unknown;
    if (!Array.isArray(emails)) {
      throw new BadGatewayException("GitHub returned an invalid email response.");
    }
    const verified = (emails as unknown[]).filter((candidate): candidate is JsonObject => {
      if (typeof candidate !== "object" || candidate === null || Array.isArray(candidate)) return false;
      const entry = candidate as JsonObject;
      return entry.verified === true && typeof entry.email === "string" && entry.email.trim().length > 0;
    });
    const selected = verified.find((candidate) => candidate.primary === true) ?? verified[0];
    if (selected === undefined) {
      throw new BadGatewayException("GitHub did not provide a verified email.");
    }
    const rawName = typeof user.name === "string" && user.name.trim().length > 0
      ? user.name
      : user.login;
    const displayName = typeof rawName === "string" && rawName.trim().length > 0
      ? rawName.trim().slice(0, 160)
      : null;
    const id = user.id;
    if (typeof id !== "number" || !Number.isSafeInteger(id) || id <= 0) {
      throw new BadGatewayException("GitHub account subject was invalid.");
    }
    return {
      subject: String(id),
      email: nonEmptyString(selected.email, "GitHub account email"),
      emailVerified: true,
      displayName
    };
  }
}
