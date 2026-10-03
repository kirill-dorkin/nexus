import {
  ForbiddenException,
  Injectable,
  ServiceUnavailableException,
  type CanActivate,
  type ExecutionContext
} from "@nestjs/common";

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

    const expected = configuredWebOrigin();
    const actual = requestOrigin(request.headers.origin);
    if (actual === null || actual !== expected) {
      throw new ForbiddenException("Browser write origin is not allowed.");
    }

    return true;
  }
}
