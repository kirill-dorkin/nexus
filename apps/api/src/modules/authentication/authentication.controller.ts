import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  Redirect,
  Req,
  Res
} from "@nestjs/common";
import {
  loginRequestSchema,
  oauthProviderSchema,
  registerRequestSchema,
  type IdentityUser,
  type OAuthProvidersResponse
} from "@platform/contracts";

import { parseRequest } from "../../http/validation";
import { AuthenticationApplicationService } from "./application/authentication.service";
import {
  OAuthCallbackFailure,
  OAuthLoginService
} from "./application/oauth-login.service";
import {
  readSessionCookie,
  serializeClearedSessionCookie,
  serializeSessionCookie
} from "./domain/session-cookie";

type AuthenticationRequest = Readonly<{
  headers: Readonly<Record<string, string | string[] | undefined>>;
}>;

type AuthenticationResponse = {
  header(name: string, value: string): unknown;
};

function currentSessionToken(request: AuthenticationRequest): string | null {
  const cookieHeader = request.headers.cookie;
  return readSessionCookie(
    typeof cookieHeader === "string" ? cookieHeader : undefined
  );
}

function setNoStore(response: AuthenticationResponse): void {
  response.header("Cache-Control", "no-store");
}

@Controller("auth")
export class AuthenticationController {
  constructor(
    private readonly authentication: AuthenticationApplicationService,
    private readonly oauth: OAuthLoginService
  ) {}

  @Get("oauth/providers")
  providers(
    @Res({ passthrough: true }) response: AuthenticationResponse
  ): OAuthProvidersResponse {
    setNoStore(response);
    return this.oauth.configuredProviders();
  }

  @Get("oauth/:provider/start")
  @Redirect(undefined, HttpStatus.FOUND)
  async startOAuth(
    @Param("provider") providerValue: string,
    @Query("returnTo") returnTo: string | undefined
  ): Promise<{ url: string; statusCode: number }> {
    const provider = parseRequest(oauthProviderSchema, providerValue);
    return {
      url: await this.oauth.start(provider, returnTo),
      statusCode: HttpStatus.FOUND
    };
  }

  @Get("oauth/:provider/callback")
  @Redirect(undefined, HttpStatus.FOUND)
  async completeOAuth(
    @Param("provider") providerValue: string,
    @Query("state") state: string | undefined,
    @Query("code") code: string | undefined,
    @Query("error") providerError: string | undefined,
    @Req() request: AuthenticationRequest,
    @Res({ passthrough: true }) response: AuthenticationResponse
  ): Promise<{ url: string; statusCode: number }> {
    let returnTo = "/me/learning";
    try {
      const provider = parseRequest(oauthProviderSchema, providerValue);
      const result = await this.oauth.complete({
        provider,
        state,
        code,
        providerError,
        currentSessionToken: currentSessionToken(request)
      });
      returnTo = result.returnTo;
      response.header(
        "Set-Cookie",
        serializeSessionCookie(result.sessionToken)
      );
      setNoStore(response);
      return {
        url: this.oauth.destination(result.returnTo),
        statusCode: HttpStatus.FOUND
      };
    } catch (error) {
      if (error instanceof OAuthCallbackFailure) returnTo = error.returnTo;
      setNoStore(response);
      const query = new URLSearchParams({
        oauthError: "external_login_failed",
        returnTo
      });
      return {
        url: `/login?${query.toString()}`,
        statusCode: HttpStatus.FOUND
      };
    }
  }

  @Post("register")
  @HttpCode(201)
  async register(
    @Body() body: unknown,
    @Req() request: AuthenticationRequest,
    @Res({ passthrough: true }) response: AuthenticationResponse
  ): Promise<IdentityUser> {
    const command = parseRequest(registerRequestSchema, body);
    const result = await this.authentication.register(
      command,
      currentSessionToken(request)
    );

    response.header("Set-Cookie", serializeSessionCookie(result.sessionToken));
    setNoStore(response);
    return result.user;
  }

  @Post("login")
  @HttpCode(200)
  async login(
    @Body() body: unknown,
    @Req() request: AuthenticationRequest,
    @Res({ passthrough: true }) response: AuthenticationResponse
  ): Promise<IdentityUser> {
    const command = parseRequest(loginRequestSchema, body);
    const result = await this.authentication.login(
      command,
      currentSessionToken(request)
    );

    response.header("Set-Cookie", serializeSessionCookie(result.sessionToken));
    setNoStore(response);
    return result.user;
  }

  @Post("logout")
  @HttpCode(204)
  async logout(
    @Req() request: AuthenticationRequest,
    @Res({ passthrough: true }) response: AuthenticationResponse
  ): Promise<void> {
    await this.authentication.logout(currentSessionToken(request));
    response.header("Set-Cookie", serializeClearedSessionCookie());
    setNoStore(response);
  }
}
