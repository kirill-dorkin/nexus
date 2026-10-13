import { BadGatewayException } from "@nestjs/common";
import { afterEach, describe, expect, it, vi } from "vitest";

import { HttpOAuthProviderGateway } from "./http-oauth-provider.gateway";

const original = {
  origin: process.env.WEB_APP_ORIGIN,
  callbackOrigin: process.env.OAUTH_CALLBACK_ORIGIN,
  googleId: process.env.GOOGLE_OAUTH_CLIENT_ID,
  googleSecret: process.env.GOOGLE_OAUTH_CLIENT_SECRET,
  githubId: process.env.GITHUB_OAUTH_CLIENT_ID,
  githubSecret: process.env.GITHUB_OAUTH_CLIENT_SECRET
};

function configure(): void {
  process.env.WEB_APP_ORIGIN = "https://app.example.test";
  process.env.OAUTH_CALLBACK_ORIGIN = "https://app.example.test";
  process.env.GOOGLE_OAUTH_CLIENT_ID = "google-client";
  process.env.GOOGLE_OAUTH_CLIENT_SECRET = "google-secret";
  process.env.GITHUB_OAUTH_CLIENT_ID = "github-client";
  process.env.GITHUB_OAUTH_CLIENT_SECRET = "github-secret";
}

function restore(name: keyof NodeJS.ProcessEnv, value: string | undefined): void {
  if (value === undefined) delete process.env[name];
  else process.env[name] = value;
}

afterEach(() => {
  vi.restoreAllMocks();
  restore("WEB_APP_ORIGIN", original.origin);
  restore("OAUTH_CALLBACK_ORIGIN", original.callbackOrigin);
  restore("GOOGLE_OAUTH_CLIENT_ID", original.googleId);
  restore("GOOGLE_OAUTH_CLIENT_SECRET", original.googleSecret);
  restore("GITHUB_OAUTH_CLIENT_ID", original.githubId);
  restore("GITHUB_OAUTH_CLIENT_SECRET", original.githubSecret);
});

describe("HttpOAuthProviderGateway", () => {
  it("exposes only fully configured providers and builds PKCE authorization URLs", () => {
    configure();
    delete process.env.GITHUB_OAUTH_CLIENT_SECRET;
    const gateway = new HttpOAuthProviderGateway();

    expect(gateway.configuredProviders()).toEqual(["google"]);
    const url = new URL(gateway.authorizationUrl({
      provider: "google",
      state: "state-value",
      codeChallenge: "challenge-value"
    }));
    expect(url.origin).toBe("https://accounts.google.com");
    expect(url.searchParams.get("state")).toBe("state-value");
    expect(url.searchParams.get("code_challenge_method")).toBe("S256");
    expect(url.searchParams.get("redirect_uri")).toBe(
      "https://app.example.test/v1/auth/oauth/google/callback"
    );
  });

  it("accepts a verified Google profile without persisting provider tokens", async () => {
    configure();
    const fetchMock = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(JSON.stringify({ access_token: "transient-token" }), {
        status: 200,
        headers: { "content-type": "application/json" }
      }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        sub: "google-subject",
        email: "Learner@Example.test",
        email_verified: true,
        name: "Learner Name"
      }), { status: 200, headers: { "content-type": "application/json" } }));

    const profile = await new HttpOAuthProviderGateway().exchangeCode({
      provider: "google",
      code: "authorization-code",
      codeVerifier: "v".repeat(64)
    });

    expect(profile).toEqual({
      subject: "google-subject",
      email: "Learner@Example.test",
      emailVerified: true,
      displayName: "Learner Name"
    });
    expect(fetchMock.mock.calls[0]?.[1]?.body?.toString()).toContain("code_verifier=");
  });

  it("rejects a Google identity whose email is not verified", async () => {
    configure();
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(JSON.stringify({ access_token: "transient-token" }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        sub: "google-subject",
        email: "learner@example.test",
        email_verified: false
      }), { status: 200 }));

    await expect(new HttpOAuthProviderGateway().exchangeCode({
      provider: "google",
      code: "authorization-code",
      codeVerifier: "v".repeat(64)
    })).rejects.toBeInstanceOf(BadGatewayException);
  });
});
