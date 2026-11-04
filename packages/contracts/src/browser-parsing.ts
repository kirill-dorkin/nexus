import { config } from "zod";

/**
 * In the browser, zod must not probe `new Function` for its fast path: the
 * Web Content Security Policy (ADR-0069) reports the probe as a violation even
 * though zod catches it. Servers keep the fast path.
 */
export function parseWithoutEvalInBrowser(): void {
  if (typeof window !== "undefined") config({ jitless: true });
}
