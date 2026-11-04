// Response headers for every Web page (ADR-0069). Pure, so next.config.ts and
// the tests build the same policy.

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

export function contentSecurityPolicy(
  options: { payments?: boolean } = {}
): string {
  const directives = options.payments ? merge(base, paddle) : base;
  return Object.entries(directives)
    .map(([name, values]) => `${name} ${values.join(" ")}`)
    .join("; ");
}

export function securityHeaders(
  options: { payments?: boolean } = {}
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
