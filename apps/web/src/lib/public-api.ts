import { parseWithoutEvalInBrowser } from "@platform/contracts/browser";

// Every browser read goes through this module before it is parsed.
parseWithoutEvalInBrowser();

function parseApiOrigin(value: string): string | null {
  try {
    const raw = value.trim();
    const url = new URL(raw);
    if (
      raw.length === 0 ||
      (url.protocol !== "http:" && url.protocol !== "https:") ||
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

export function publicApiOrigin(): string {
  const configured = process.env.NEXT_PUBLIC_API_ORIGIN;
  if (configured === undefined || configured.trim().length === 0) {
    throw new Error(
      "NEXT_PUBLIC_API_ORIGIN is required for the web application."
    );
  }

  // Explicit same-origin mode for a shared Web/API edge such as Vercel Services.
  if (configured === "/") return "";

  const origin = parseApiOrigin(configured);
  if (origin === null) {
    throw new Error(
      "NEXT_PUBLIC_API_ORIGIN must be '/' or an absolute HTTP(S) origin."
    );
  }
  return origin;
}

export function publicApiUrl(path: string): string {
  assertApiPath(path);
  return `${publicApiOrigin()}${path}`;
}

export function assertApiPath(path: string): void {
  if (
    !path.startsWith("/") ||
    path.startsWith("//") ||
    path.includes("\\") ||
    // Rejecting control characters and spaces is the point of this check.
    // eslint-disable-next-line no-control-regex
    /[\u0000-\u0020\u007f]/.test(path)
  ) {
    throw new Error("API path must be an absolute path on the configured API.");
  }
}

export class PublicApiError extends Error {
  constructor(
    readonly status: number,
    message: string
  ) {
    super(message);
    this.name = "PublicApiError";
  }
}

export async function browserApiRequest(
  path: string,
  init: RequestInit = {}
): Promise<Response> {
  const headers = new Headers(init.headers);
  if (
    init.body !== undefined &&
    init.body !== null &&
    !headers.has("content-type")
  ) {
    headers.set("content-type", "application/json");
  }

  return fetch(publicApiUrl(path), {
    ...init,
    headers,
    credentials: "include",
    cache: "no-store"
  });
}

export async function apiError(response: Response): Promise<PublicApiError> {
  let message = `API request failed with status ${response.status}.`;
  try {
    const body = (await response.json()) as {
      message?: string | string[];
    };
    if (typeof body.message === "string" && body.message.length > 0) {
      message = body.message;
    } else if (Array.isArray(body.message) && body.message.length > 0) {
      message = body.message.join(" ");
    }
  } catch {
    // Keep the status-based fallback for non-JSON failures.
  }
  return new PublicApiError(response.status, message);
}
