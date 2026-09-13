import { describe, expect, it } from "vitest";

import { createSessionToken } from "./session-token";
import {
  readSessionCookie,
  serializeClearedSessionCookie,
  serializeSessionCookie,
  SESSION_COOKIE_NAME
} from "./session-cookie";

describe("session cookie", () => {
  it("uses a host-only secure HttpOnly strict cookie", () => {
    const token = createSessionToken();
    const serialized = serializeSessionCookie(token);

    expect(serialized).toBe(
      `${SESSION_COOKIE_NAME}=${token}; Path=/; HttpOnly; Secure; SameSite=Strict`
    );
    expect(serialized).not.toContain("Domain=");
  });

  it("reads exactly one well-formed session cookie", () => {
    const token = createSessionToken();

    expect(
      readSessionCookie(`theme=dark; ${SESSION_COOKIE_NAME}=${token}; locale=en`)
    ).toBe(token);
    expect(
      readSessionCookie(
        `${SESSION_COOKIE_NAME}=${token}; ${SESSION_COOKIE_NAME}=${createSessionToken()}`
      )
    ).toBeNull();
    expect(readSessionCookie(`${SESSION_COOKIE_NAME}=malformed`)).toBeNull();
  });

  it("clears the same cookie scope on logout", () => {
    expect(serializeClearedSessionCookie()).toContain(
      `${SESSION_COOKIE_NAME}=; Path=/; HttpOnly; Secure; SameSite=Strict`
    );
    expect(serializeClearedSessionCookie()).toContain("Max-Age=0");
  });
});
