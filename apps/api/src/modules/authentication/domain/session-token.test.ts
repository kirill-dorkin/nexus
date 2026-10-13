import { describe, expect, it } from "vitest";

import {
  createSessionToken,
  hashSessionToken,
  isSessionToken
} from "./session-token";

describe("session tokens", () => {
  it("generates opaque 256-bit base64url tokens", () => {
    const first = createSessionToken();
    const second = createSessionToken();

    expect(first).toHaveLength(43);
    expect(isSessionToken(first)).toBe(true);
    expect(second).not.toBe(first);
  });

  it("stores only a deterministic SHA-256 lookup hash", () => {
    const token = createSessionToken();
    const hash = hashSessionToken(token);

    expect(hash).toMatch(/^[0-9a-f]{64}$/);
    expect(hash).toBe(hashSessionToken(token));
    expect(hash).not.toContain(token);
  });

  it("rejects malformed token shapes before database lookup", () => {
    expect(isSessionToken("not-a-session-token")).toBe(false);
  });
});
