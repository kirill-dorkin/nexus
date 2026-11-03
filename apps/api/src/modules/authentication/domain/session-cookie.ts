import { isSessionToken } from "./session-token";

export const SESSION_COOKIE_NAME = "__Host-id";

export function readSessionCookie(
  cookieHeader: string | undefined
): string | null {
  if (cookieHeader === undefined || cookieHeader.length === 0) {
    return null;
  }

  const matches: string[] = [];
  for (const part of cookieHeader.split(";")) {
    const trimmed = part.trim();
    const separator = trimmed.indexOf("=");
    if (separator <= 0) {
      continue;
    }

    const name = trimmed.slice(0, separator);
    if (name === SESSION_COOKIE_NAME) {
      matches.push(trimmed.slice(separator + 1));
    }
  }

  if (matches.length !== 1) {
    return null;
  }

  const token = matches[0];
  return token !== undefined && isSessionToken(token) ? token : null;
}

export function serializeSessionCookie(sessionToken: string): string {
  if (!isSessionToken(sessionToken)) {
    throw new Error(
      "A valid opaque session token is required for the session cookie."
    );
  }

  return `${SESSION_COOKIE_NAME}=${sessionToken}; Path=/; HttpOnly; Secure; SameSite=Strict`;
}

export function serializeClearedSessionCookie(): string {
  return `${SESSION_COOKIE_NAME}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT`;
}
