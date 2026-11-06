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
  Res,
  UseGuards
} from "@nestjs/common";
import {
  loginRequestSchema,
  oauthProviderSchema,
  passwordResetConfirmSchema,
  passwordResetRequestSchema,
  registerRequestSchema,
  type IdentityUser,
  type OAuthProvidersResponse,
  type PasswordResetAvailability
} from "@platform/contracts";

import { RateLimit, RateLimitGuard } from "../../http/rate-limit";
import { parseRequest } from "../../http/validation";
import { AuthenticationApplicationService } from "./application/authentication.service";
import {
  OAuthCallbackFailure,
  OAuthLoginService
} from "./application/oauth-login.service";
import { PasswordResetService } from "./application/password-reset.service";
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
    private readonly oauth: OAuthLoginService,
    private readonly passwordReset: PasswordResetService
  ) {}

  @Get("password-reset")
  passwordResetAvailability(
    @Res({ passthrough: true }) response: AuthenticationResponse
  ): PasswordResetAvailability {
    setNoStore(response);
    return { available: this.passwordReset.available() };
  }

  /** Always 202 with no body: the answer never reveals whether an account exists. */
  @Post("password-reset/request")
  @UseGuards(RateLimitGuard)
  @RateLimit("auth.password_reset_request")
  @HttpCode(202)
  async requestPasswordReset(
    @Body() body: unknown,
    @Res({ passthrough: true }) response: AuthenticationResponse
  ): Promise<void> {
    const command = parseRequest(passwordResetRequestSchema, body);
    await this.passwordReset.request(command);
    setNoStore(response);
  }

  /** Sets the new password, revokes every session and signs the learner in. */
  @Post("password-reset/confirm")
  @UseGuards(RateLimitGuard)
  @RateLimit("auth.password_reset_confirm")
  @HttpCode(200)
  async confirmPasswordReset(
    @Body() body: unknown,
    @Res({ passthrough: true }) response: AuthenticationResponse
  ): Promise<IdentityUser> {
    const command = parseRequest(passwordResetConfirmSchema, body);
    const result = await this.passwordReset.confirm(command);
    response.header("Set-Cookie", serializeSessionCookie(result.sessionToken));
    setNoStore(response);
    return result.user;
  }

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
  @UseGuards(RateLimitGuard)
  @RateLimit("auth.register")
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
  @UseGuards(RateLimitGuard)
  @RateLimit("auth.login")
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
