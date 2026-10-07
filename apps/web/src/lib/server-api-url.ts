import { assertApiPath, publicApiUrl } from "./public-api";

/** URL policy only; the server-only caller reads the binding at request time. */
export function resolveServerApiUrl(
  path: string,
  binding: string | undefined
): string {
  assertApiPath(path);
  if (binding !== undefined) {
    const base = new URL(binding);
    if (
      (base.protocol !== "https:" && base.protocol !== "http:") ||
      base.username ||
      base.password ||
      base.search ||
      base.hash
    ) {
      throw new Error("API_INTERNAL_URL must be an HTTP(S) service base URL.");
    }
    // Preserve a possible binding path prefix instead of replacing it with /v1.
    if (!base.pathname.endsWith("/")) base.pathname += "/";
    return new URL(path.slice(1), base).href;
  }

  const fallback = publicApiUrl(path);
  if (fallback.startsWith("/")) {
    throw new Error(
      "API_INTERNAL_URL is required for server reads in same-origin mode."
    );
  }
  return fallback;
}
