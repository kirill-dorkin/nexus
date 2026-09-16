import { readFileSync } from "node:fs";

import {
  GraderExecutionProfileRegistry,
  parseGraderExecutionProfilesJson,
  type GraderExecutionProfile
} from "@platform/contracts/grader";

export const GRADER_SANDBOX_NAMESPACE = "platform-grader-sandbox";
export const GRADER_GVISOR_RUNTIME_CLASS = "platform-gvisor";
export const GRADER_SANDBOX_RUNNER_SERVICE_ACCOUNT = "grader-sandbox-runner";

export type KubernetesGvisorProviderConfig = Readonly<{
  apiUrl: string;
  runnerImageRepository: string;
  serviceAccountTokenFile: string;
  caCertificate: string | null;
  pollIntervalMs: number;
  requestTimeoutMs: number;
  startupGraceMs: number;
  cleanupTtlSeconds: number;
  ephemeralStorageMiB: number;
  podPidsLimit: number;
}>;

export type GraderGatewayRuntimeConfig = Readonly<{
  port: number;
  serviceToken: string;
  profiles: readonly GraderExecutionProfile[];
  sandboxProvider:
    | Readonly<{ kind: "unavailable" }>
    | Readonly<{ kind: "kubernetes-gvisor"; config: KubernetesGvisorProviderConfig }>;
}>;

const imageRepositoryPattern = /^[a-z0-9]+(?:[._-][a-z0-9]+)*(?::[0-9]+)?(?:\/[a-z0-9]+(?:[._-][a-z0-9]+)*)+$/;

function required(env: NodeJS.ProcessEnv, name: string): string {
  const value = env[name];
  if (value === undefined || value.trim().length === 0) {
    throw new Error(`${name} is required.`);
  }
  return value.trim();
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

function normalizeApiUrl(raw: string, production: boolean): string {
  const url = new URL(raw);
  if (url.username.length > 0 || url.password.length > 0 || url.search.length > 0 || url.hash.length > 0) {
    throw new Error("GRADER_KUBERNETES_API_URL must not contain credentials, query, or fragment components.");
  }
  if (url.pathname !== "/" && url.pathname !== "") {
    throw new Error("GRADER_KUBERNETES_API_URL must contain only an origin.");
  }
  const loopback = url.hostname === "localhost" || url.hostname === "127.0.0.1" || url.hostname === "[::1]";
  if (production) {
    if (url.protocol !== "https:") {
      throw new Error("GRADER_KUBERNETES_API_URL must use https in production.");
    }
  } else if (url.protocol !== "https:" && !(url.protocol === "http:" && loopback)) {
    throw new Error("Non-production HTTP Kubernetes API URLs are allowed only on loopback.");
  }
  return url.origin;
}

function validateImageRepository(value: string): string {
  if (value.includes("@") || !imageRepositoryPattern.test(value)) {
    throw new Error(
      "GRADER_KUBERNETES_RUNNER_IMAGE_REPOSITORY must be an untagged OCI repository path."
    );
  }
  return value;
}

function readCredential(path: string, name: string): string {
  let value: string;
  try {
    value = readFileSync(path, "utf8").trim();
  } catch {
    throw new Error(`${name} could not be read.`);
  }
  if (value.length === 0) throw new Error(`${name} must not be empty.`);
  return value;
}

function readableCredentialPath(path: string, name: string): string {
  readCredential(path, name);
  return path;
}

export function loadGraderGatewayRuntimeConfig(
  env: NodeJS.ProcessEnv = process.env
): GraderGatewayRuntimeConfig {
  const serviceToken = required(env, "GRADER_GATEWAY_SERVICE_TOKEN");
  if (Buffer.byteLength(serviceToken, "utf8") < 32) {
    throw new Error("GRADER_GATEWAY_SERVICE_TOKEN must contain at least 32 bytes.");
  }

  const profiles = parseGraderExecutionProfilesJson(env.GRADER_EXECUTION_PROFILES_JSON);
  new GraderExecutionProfileRegistry(profiles);

  const port = integer(env, "GRADER_GATEWAY_PORT", 4100, 1, 65_535);
  const provider = env.GRADER_SANDBOX_PROVIDER?.trim() || "unavailable";
  if (provider === "unavailable") {
    return { port, serviceToken, profiles, sandboxProvider: { kind: "unavailable" } };
  }
  if (provider !== "kubernetes-gvisor") {
    throw new Error("GRADER_SANDBOX_PROVIDER must be unavailable or kubernetes-gvisor.");
  }

  const apiUrl = normalizeApiUrl(
    required(env, "GRADER_KUBERNETES_API_URL"),
    env.NODE_ENV === "production"
  );
  const tokenFile = readableCredentialPath(
    required(env, "GRADER_KUBERNETES_SERVICE_ACCOUNT_TOKEN_FILE"),
    "GRADER_KUBERNETES_SERVICE_ACCOUNT_TOKEN_FILE"
  );
  const caFile = env.GRADER_KUBERNETES_CA_FILE?.trim();
  const caCertificate = apiUrl.startsWith("https:")
    ? readCredential(required(env, "GRADER_KUBERNETES_CA_FILE"), "GRADER_KUBERNETES_CA_FILE")
    : caFile === undefined || caFile.length === 0
      ? null
      : readCredential(caFile, "GRADER_KUBERNETES_CA_FILE");

  return {
    port,
    serviceToken,
    profiles,
    sandboxProvider: {
      kind: "kubernetes-gvisor",
      config: {
        apiUrl,
        runnerImageRepository: validateImageRepository(
          required(env, "GRADER_KUBERNETES_RUNNER_IMAGE_REPOSITORY")
        ),
        serviceAccountTokenFile: tokenFile,
        caCertificate,
        pollIntervalMs: integer(env, "GRADER_KUBERNETES_POLL_INTERVAL_MS", 250, 50, 5_000),
        requestTimeoutMs: integer(
          env,
          "GRADER_KUBERNETES_REQUEST_TIMEOUT_MS",
          5_000,
          500,
          30_000
        ),
        startupGraceMs: integer(
          env,
          "GRADER_KUBERNETES_STARTUP_GRACE_MS",
          15_000,
          1_000,
          60_000
        ),
        cleanupTtlSeconds: integer(
          env,
          "GRADER_KUBERNETES_CLEANUP_TTL_SECONDS",
          300,
          60,
          3_600
        ),
        ephemeralStorageMiB: integer(
          env,
          "GRADER_KUBERNETES_EPHEMERAL_STORAGE_MIB",
          128,
          16,
          512
        ),
        podPidsLimit: integer(env, "GRADER_KUBERNETES_POD_PIDS_LIMIT", 64, 1, 64)
      }
    }
  };
}