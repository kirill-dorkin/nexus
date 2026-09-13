import {
  Body,
  Controller,
  HttpCode,
  Post,
  Req,
  Res
} from "@nestjs/common";
import {
  loginRequestSchema,
  registerRequestSchema,
  type IdentityUser
} from "@platform/contracts";

import { parseRequest } from "../../http/validation";
import { AuthenticationApplicationService } from "./application/authentication.service";
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
    private readonly authentication: AuthenticationApplicationService
  ) {}

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
