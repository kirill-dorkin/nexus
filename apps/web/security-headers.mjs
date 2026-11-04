// Response headers for every Web page (ADR-0069). Plain JavaScript on purpose:
// `next start` compiles only next.config.ts, so the config can import an .mjs
// file but not another TypeScript module. Types: security-headers.d.mts.

/** @typedef {Record<string, readonly string[]>} Directives */

/** @type {Directives} */
const base = {
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
/** @type {Directives} */
const paddle = {
  "script-src": ["https://cdn.paddle.com"],
  "style-src": ["https://cdn.paddle.com"],
  "connect-src": ["https://*.paddle.com"],
  "frame-src": ["https://buy.paddle.com", "https://sandbox-buy.paddle.com"]
};

/**
 * @param {...Directives} sets
 * @returns {Directives}
 */
function merge(...sets) {
  /** @type {Record<string, string[]>} */
  const result = {};
  for (const set of sets)
    for (const [name, values] of Object.entries(set))
      result[name] = [...(result[name] ?? []), ...values];
  return result;
}

/** The API origin the browser may call, when it is not the site itself. */
/**
 * @param {string | undefined} value
 * @returns {string | null}
 */
export function separateApiOrigin(value) {
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

/**
 * @param {{ payments?: boolean; apiOrigin?: string | undefined }} [options]
 * @returns {string}
 */
export function contentSecurityPolicy(options = {}) {
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

/**
 * @param {{ payments?: boolean; apiOrigin?: string | undefined }} [options]
 * @returns {{ key: string; value: string }[]}
 */
export function securityHeaders(options = {}) {
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
