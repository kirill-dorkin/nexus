import { createHash, randomBytes } from "node:crypto";

function base64Url(bytes: Buffer): string {
  return bytes.toString("base64url");
}

export function createOAuthState(): string {
  return base64Url(randomBytes(32));
}

export function createCodeVerifier(): string {
  return base64Url(randomBytes(48));
}

export function sha256Hex(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function createCodeChallenge(verifier: string): string {
  return createHash("sha256").update(verifier).digest("base64url");
}
