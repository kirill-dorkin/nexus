import {
  ForbiddenException,
  Injectable,
  ServiceUnavailableException,
  type CanActivate,
  type ExecutionContext
} from "@nestjs/common";

import type { PlatformPrincipalCarrier } from "../request-context/platform-principal";

type BrowserWriteRequest = PlatformPrincipalCarrier & {
  headers: Readonly<Record<string, string | string[] | undefined>>;
};

function configuredWebOrigin(): string {
  const configured = process.env.WEB_APP_ORIGIN;
  if (configured === undefined || configured.trim().length === 0) {
    throw new ServiceUnavailableException(
      "WEB_APP_ORIGIN is required for authenticated browser writes."
    );
  }

  try {
    const url = new URL(configured.trim());
    if (
      url.username.length > 0 ||
      url.password.length > 0 ||
      url.pathname !== "/" ||
      url.search.length > 0 ||
      url.hash.length > 0
    ) {
      throw new Error("not an origin");
    }
    return url.origin;
  } catch {
    throw new ServiceUnavailableException(
      "WEB_APP_ORIGIN must be an absolute HTTP(S) origin."
    );
  }
}

function requestOrigin(value: string | string[] | undefined): string | null {
  if (typeof value !== "string" || value.trim().length === 0) {
    return null;
  }

  try {
    const raw = value.trim();
    const url = new URL(raw);
    if (
      url.origin !== raw ||
      url.username.length > 0 ||
      url.password.length > 0 ||
      url.pathname !== "/" ||
      url.search.length > 0 ||
      url.hash.length > 0
    ) {
      return null;
    }
    return url.origin;
  } catch {
    return null;
  }
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
