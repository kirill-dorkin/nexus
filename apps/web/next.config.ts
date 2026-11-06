import type { NextConfig } from "next";

// Security headers for every page (ADR-0069). They live in this file on
// purpose: `next start apps/web` compiles only next.config.ts and resolves its
// relative imports from the working directory, so an imported module is not
// found in the production container.

type SecurityHeaderOptions = {
  payments?: boolean;
  /** NEXT_PUBLIC_API_ORIGIN; an absolute origin is added to connect-src (ADR-0058 allows a separate API origin). */
  apiOrigin?: string | undefined;
};

type Directives = Record<string, readonly string[]>;

const base: Directives = {
  "default-src": ["'self'"],
  // Next streams its data in inline scripts and lesson practice runs inline
  // scripts in srcdoc frames, which inherit this policy; nonces cannot reach
  // those frames, so inline scripts stay allowed. External scripts do not.
  "script-src": ["'self'", "'unsafe-inline'", "'wasm-unsafe-eval'"],
  "style-src": ["'self'", "'unsafe-inline'"],
  // Learners' practice pages may show images from anywhere.
  "img-src": ["'self'", "data:", "blob:", "https:"],
  "media-src": ["'self'", "data:", "blob:", "https:"],
  "font-src": ["'self'", "data:"],
  "connect-src": ["'self'"],
  "frame-src": ["'self'", "https://www.youtube-nocookie.com"],
  "worker-src": ["'self'", "blob:"],
  "manifest-src": ["'self'"],
  "object-src": ["'none'"],
  "base-uri": ["'self'"],
  "form-action": ["'self'"],
  "frame-ancestors": ["'none'"]
};

/** Paddle.js runs its checkout from its own CDN and frames (payment pages only). */
const paddle: Directives = {
  "script-src": ["https://cdn.paddle.com"],
  "style-src": ["https://cdn.paddle.com"],
  "connect-src": ["https://*.paddle.com"],
  "frame-src": ["https://buy.paddle.com", "https://sandbox-buy.paddle.com"]
};

function merge(...sets: Directives[]): Directives {
  const result: Record<string, string[]> = {};
  for (const set of sets)
    for (const [name, values] of Object.entries(set))
      result[name] = [...(result[name] ?? []), ...values];
  return result;
}

/** The API origin the browser may call, when it is not the site itself. */
function separateApiOrigin(value: string | undefined): string | null {
  if (value === undefined || value.trim() === "" || value.trim() === "/")
    return null;
  try {
    const url = new URL(value.trim());
    return url.protocol === "https:" || url.protocol === "http:"
      ? url.origin
      : null;
  } catch {
    return null;
  }
}

function contentSecurityPolicy(options: SecurityHeaderOptions = {}): string {
  const api = separateApiOrigin(options.apiOrigin);
  const directives = merge(
    base,
    options.payments ? paddle : {},
    api ? { "connect-src": [api] } : {}
  );
  return Object.entries(directives)
    .map(([name, values]) => `${name} ${values.join(" ")}`)
    .join("; ");
}

function securityHeaders(
  options: SecurityHeaderOptions = {}
): { key: string; value: string }[] {
  return [
    {
      key: "Content-Security-Policy",
      value: contentSecurityPolicy(options)
    },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    { key: "X-Content-Type-Options", value: "nosniff" },
    {
      key: "Permissions-Policy",
      value:
        "camera=(), microphone=(), geolocation=(), payment=(self), usb=(), interest-cohort=()"
    }
  ];
}

/** PostHog project key (EU cloud). Empty until the project exists; then analytics turns on. */
const POSTHOG_PROJECT_KEY = "";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  agentRules: false,
  transpilePackages: ["@platform/brand", "@platform/checks", "@platform/ui"],
  env: {
    // Client telemetry names the deployed build (ADR-0067), never the visitor.
    NEXT_PUBLIC_RELEASE:
      process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 12) ?? "local",
    // Product analytics (ADR-0086) runs only in the production build: previews, CI and local
    // runs never show the consent banner or send events. The project key is public by design.
    NEXT_PUBLIC_POSTHOG_KEY:
      process.env.VERCEL_ENV === "production"
        ? (process.env.NEXT_PUBLIC_POSTHOG_KEY ?? POSTHOG_PROJECT_KEY)
        : ""
  },
  headers() {
    return Promise.resolve([
      // Every page except the Paddle checkout, which gets the same policy
      // plus Paddle's own origins (two matching rules would both apply).
      {
        source: "/:path((?!checkout/paddle/).*)",
        headers: securityHeaders({
          apiOrigin: process.env.NEXT_PUBLIC_API_ORIGIN
        })
      },
      {
        source: "/checkout/paddle/:path*",
        headers: securityHeaders({
          payments: true,
          apiOrigin: process.env.NEXT_PUBLIC_API_ORIGIN
        })
      }
    ]);
  }
};

export default nextConfig;
