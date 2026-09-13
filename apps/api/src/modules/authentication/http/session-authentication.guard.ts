import {
  type CanActivate,
  type ExecutionContext,
  Injectable
} from "@nestjs/common";

import {
  attachPlatformPrincipal,
  type PlatformPrincipalCarrier
} from "../../../request-context/platform-principal";
import { AuthenticationApplicationService } from "../application/authentication.service";
import { readSessionCookie } from "../domain/session-cookie";

type AuthenticationRequest = PlatformPrincipalCarrier & {
  headers: Readonly<Record<string, string | string[] | undefined>>;
};

@Injectable()
export class SessionAuthenticationGuard implements CanActivate {
  constructor(
    private readonly authentication: AuthenticationApplicationService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticationRequest>();

    if (request.platformPrincipal !== undefined) {
      return true;
    }

    const cookieHeader = request.headers.cookie;
    const sessionToken = readSessionCookie(
      typeof cookieHeader === "string" ? cookieHeader : undefined
    );

    if (sessionToken === null) {
      return true;
    }

    const userId = await this.authentication.resolveSessionUserId(sessionToken);
    if (userId !== null) {
      attachPlatformPrincipal(request, { userId });
    }

    return true;
  }
}
