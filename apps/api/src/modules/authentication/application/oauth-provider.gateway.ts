import type { OAuthProvider } from "@platform/contracts";

export type OAuthIdentityProfile = Readonly<{
  subject: string;
  email: string;
  emailVerified: true;
  displayName: string | null;
}>;

export abstract class OAuthProviderGateway {
  abstract configuredProviders(): readonly OAuthProvider[];

  abstract authorizationUrl(
    input: Readonly<{
      provider: OAuthProvider;
      state: string;
      codeChallenge: string;
    }>
  ): string;

  abstract exchangeCode(
    input: Readonly<{
      provider: OAuthProvider;
      code: string;
      codeVerifier: string;
    }>
  ): Promise<OAuthIdentityProfile>;
}
