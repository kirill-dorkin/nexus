export type GraderWorkerConfig = Readonly<{
  databaseUrl: string;
  gatewayUrl: string;
  gatewayServiceToken: string;
  gatewayTimeoutMs: number;
  leaseSeconds: number;
  pollIntervalMs: number;
  retryBaseMs: number;
  retryMaxMs: number;
}>;

function required(env: NodeJS.ProcessEnv, name: string): string {
  const value = env[name];
  if (value === undefined || value.trim().length === 0) {
    throw new Error(`${name} is required.`);
  }
  return value;
}

function integer(
  env: NodeJS.ProcessEnv,
  name: string,
  fallback: number,
  minimum: number,
  maximum: number
): number {
  const raw = env[name];
  const value = raw === undefined || raw.trim().length === 0 ? fallback : Number(raw);
  if (!Number.isInteger(value) || value < minimum || value > maximum) {
    throw new Error(`${name} must be an integer between ${minimum} and ${maximum}.`);
  }
  return value;
}

function normalizeGatewayUrl(raw: string, production: boolean): string {
  const url = new URL(raw);
  if (url.username.length > 0 || url.password.length > 0 || url.search.length > 0 || url.hash.length > 0) {
    throw new Error("GRADER_GATEWAY_URL must not contain credentials, query, or fragment components.");
  }

  const loopback = url.hostname === "localhost" || url.hostname === "127.0.0.1" || url.hostname === "[::1]";
  if (production) {
    if (url.protocol !== "https:") {
      throw new Error("GRADER_GATEWAY_URL must use https in production.");
    }
  } else if (url.protocol !== "https:" && !(url.protocol === "http:" && loopback)) {
    throw new Error("Non-production HTTP Grader Gateway URLs are allowed only on loopback.");
  }

  url.pathname = url.pathname.replace(/\/+$/, "");
  return url.toString().replace(/\/$/, "");
}

export function loadGraderWorkerConfig(env: NodeJS.ProcessEnv = process.env): GraderWorkerConfig {
  const databaseUrl = required(env, "DATABASE_WORKER_URL");
  const gatewayServiceToken = required(env, "GRADER_GATEWAY_SERVICE_TOKEN");
  if (Buffer.byteLength(gatewayServiceToken, "utf8") < 32) {
    throw new Error("GRADER_GATEWAY_SERVICE_TOKEN must contain at least 32 bytes.");
  }

  const gatewayTimeoutMs = integer(env, "GRADER_GATEWAY_TIMEOUT_MS", 35_000, 1_000, 120_000);
  const leaseSeconds = integer(env, "GRADER_WORKER_LEASE_SECONDS", 60, 1, 900);
  const pollIntervalMs = integer(env, "GRADER_WORKER_POLL_INTERVAL_MS", 1_000, 50, 60_000);
  const retryBaseMs = integer(env, "GRADER_WORKER_RETRY_BASE_MS", 1_000, 100, 60_000);
  const retryMaxMs = integer(env, "GRADER_WORKER_RETRY_MAX_MS", 60_000, 100, 300_000);

  if (retryMaxMs < retryBaseMs) {
    throw new Error("GRADER_WORKER_RETRY_MAX_MS must be greater than or equal to GRADER_WORKER_RETRY_BASE_MS.");
  }
  if (gatewayTimeoutMs + 5_000 >= leaseSeconds * 1_000) {
    throw new Error("GRADER_WORKER_LEASE_SECONDS must exceed the Gateway timeout by at least 5 seconds.");
  }

  return {
    databaseUrl,
    gatewayUrl: normalizeGatewayUrl(required(env, "GRADER_GATEWAY_URL"), env.NODE_ENV === "production"),
    gatewayServiceToken,
    gatewayTimeoutMs,
    leaseSeconds,
    pollIntervalMs,
    retryBaseMs,
    retryMaxMs
  };
}
