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
    throw new Error("NEXT_PUBLIC_API_ORIGIN is required for the web application.");
  }

  const origin = parseApiOrigin(configured);
  if (origin === null) {
    throw new Error(
      "NEXT_PUBLIC_API_ORIGIN must be an absolute HTTP(S) origin."
    );
  }
  return origin;
}

export function publicApiUrl(path: string): string {
  if (!path.startsWith("/")) {
    throw new Error("API path must start with '/'.");
  }
  return `${publicApiOrigin()}${path}`;
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
  if (init.body !== undefined && init.body !== null && !headers.has("content-type")) {
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
