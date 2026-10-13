function isHttpProtocol(protocol: string): boolean {
  return protocol === "http:" || protocol === "https:";
}

export function parseExactHttpOrigin(value: string): string | null {
  if (value.trim().length === 0) {
    return null;
  }

  try {
    const raw = value.trim();
    const url = new URL(raw);
    if (
      !isHttpProtocol(url.protocol) ||
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

export function optionalConfiguredWebOrigin(): string | null {
  const configured = process.env.WEB_APP_ORIGIN;
  if (configured === undefined || configured.trim().length === 0) {
    return null;
  }

  const origin = parseExactHttpOrigin(configured);
  if (origin === null) {
    throw new Error("WEB_APP_ORIGIN must be an absolute HTTP(S) origin.");
  }
  return origin;
}
