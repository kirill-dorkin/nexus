import {
  ForbiddenException,
  Injectable,
  ServiceUnavailableException,
  type CanActivate,
  type ExecutionContext
} from "@nestjs/common";

import { recordPublicLaunchSecurityEvent } from "../observability/public-launch-operational-events";
import {
  optionalConfiguredWebOrigin,
  parseExactHttpOrigin
} from "./web-app-origin";

type OriginRequest = {
  headers: Readonly<Record<string, string | string[] | undefined>>;
};

/**
 * Only the Web app itself may call the route, signed in or not: the Origin
 * header must equal WEB_APP_ORIGIN exactly. Unlike BrowserWriteOriginGuard
 * it also refuses anonymous callers, for public writes such as feedback.
 */
@Injectable()
export class ExactWebOriginGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<OriginRequest>();
    let expected: string | null;
    try {
      expected = optionalConfiguredWebOrigin();
    } catch {
      expected = null;
    }
    if (expected === null) {
      recordPublicLaunchSecurityEvent(
        "misconfigured",
        "web_origin_unavailable"
      );
      throw new ServiceUnavailableException(
        "WEB_APP_ORIGIN is not configured."
      );
    }
    const origin = request.headers.origin;
    const actual =
      typeof origin === "string" ? parseExactHttpOrigin(origin) : null;
    if (actual !== expected) {
      recordPublicLaunchSecurityEvent(
        "rejected",
        actual === null ? "origin_missing_or_invalid" : "origin_mismatch"
      );
      throw new ForbiddenException("Origin is not allowed.");
    }
    return true;
  }
}
