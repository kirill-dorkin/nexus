import {
  ForbiddenException,
  Injectable,
  ServiceUnavailableException,
  type CanActivate,
  type ExecutionContext
} from "@nestjs/common";

import { recordPublicLaunchSecurityEvent } from "../observability/public-launch-operational-events";
import type { PlatformPrincipalCarrier } from "../request-context/platform-principal";
import {
  optionalConfiguredWebOrigin,
  parseExactHttpOrigin
} from "./web-app-origin";

type BrowserWriteRequest = PlatformPrincipalCarrier & {
  headers: Readonly<Record<string, string | string[] | undefined>>;
};

function configuredWebOrigin(): string {
  let configured: string | null;
  try {
    configured = optionalConfiguredWebOrigin();
  } catch {
    throw new ServiceUnavailableException(
      "WEB_APP_ORIGIN must be an absolute HTTP(S) origin."
    );
  }

  if (configured === null) {
    throw new ServiceUnavailableException(
      "WEB_APP_ORIGIN is required for authenticated browser writes."
    );
  }
  return configured;
}

function requestOrigin(value: string | string[] | undefined): string | null {
  return typeof value === "string" ? parseExactHttpOrigin(value) : null;
}

@Injectable()
export class BrowserWriteOriginGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<BrowserWriteRequest>();

    // Unauthenticated requests carry no ambient browser authority and continue to
    // the normal authentication boundary, which returns the canonical 401.
    if (request.platformPrincipal === undefined) {
      return true;
    }

    let expected: string;
    try {
      expected = configuredWebOrigin();
    } catch (error) {
      recordPublicLaunchSecurityEvent(
        "misconfigured",
        "web_origin_unavailable"
      );
      throw error;
    }

    const actual = requestOrigin(request.headers.origin);
    if (actual === null) {
      recordPublicLaunchSecurityEvent("rejected", "origin_missing_or_invalid");
      throw new ForbiddenException("Browser write origin is not allowed.");
    }
    if (actual !== expected) {
      recordPublicLaunchSecurityEvent("rejected", "origin_mismatch");
      throw new ForbiddenException("Browser write origin is not allowed.");
    }

    recordPublicLaunchSecurityEvent("allowed", "origin_match");
    return true;
  }
}
