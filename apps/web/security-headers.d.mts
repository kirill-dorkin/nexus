export type SecurityHeaderOptions = {
  payments?: boolean;
  /** NEXT_PUBLIC_API_ORIGIN; an absolute origin is added to connect-src (ADR-0058 allows a separate API origin). */
  apiOrigin?: string | undefined;
};

/** The API origin the browser may call, when it is not the site itself. */
export function separateApiOrigin(value: string | undefined): string | null;

export function contentSecurityPolicy(options?: SecurityHeaderOptions): string;

export function securityHeaders(
  options?: SecurityHeaderOptions
): { key: string; value: string }[];
