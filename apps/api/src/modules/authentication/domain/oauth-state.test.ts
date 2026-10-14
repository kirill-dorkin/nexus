import { describe, expect, it } from "vitest";

import {
  createCodeChallenge,
  createCodeVerifier,
  createOAuthState,
  sha256Hex
} from "./oauth-state";

describe("OAuth state", () => {
  it("creates unpredictable URL-safe state and a valid S256 verifier pair", () => {
    const firstState = createOAuthState();
    const secondState = createOAuthState();
    const verifier = createCodeVerifier();

    expect(firstState).not.toBe(secondState);
    expect(firstState).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(verifier).toMatch(/^[A-Za-z0-9_-]{64}$/);
    expect(createCodeChallenge(verifier)).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(sha256Hex(firstState)).toMatch(/^[a-f0-9]{64}$/);
  });
});
