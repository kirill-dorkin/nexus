import {
  GraderExecutionProfileRegistry,
  type GraderExecutionProfile
} from "./execution-profile.js";
import {
  InClusterKubernetesSandboxControlPlane,
  KubernetesGvisorSandboxProvider,
  type KubernetesSandboxProviderConfig
} from "./kubernetes-sandbox-provider.js";
import { SandboxProvider, UnavailableSandboxProvider } from "./sandbox-provider.js";

export type GraderGatewayRuntimeConfig = Readonly<{
  port: number;
  serviceToken: string;
  profileRegistry: GraderExecutionProfileRegistry;
  sandboxProvider: SandboxProvider;
}>;

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (value === undefined || value.length === 0) {
    throw new Error(`${name} is required.`);
  }
  return value;
}

function integer(
  name: string,
  fallback: number,
  limits: Readonly<{ min: number; max: number }>
): number {
  const raw = process.env[name]?.trim();
  if (raw === undefined || raw.length === 0) return fallback;
  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed < limits.min || parsed > limits.max) {
    throw new Error(`${name} must be an integer between ${limits.min} and ${limits.max}.`);
  }
  return parsed;
}

function kubernetesName(name: string, value: string): string {
  if (value.length > 63 || !/^[a-z0-9](?:[-a-z0-9.]*[a-z0-9])?$/.test(value)) {
    throw new Error(`${name} must be a valid Kubernetes DNS label/name.`);
  }
  return value;
}

function imageRepository(value: string): string {
  if (value.includes("@") || value.includes("://") || /\s/.test(value)) {
    throw new Error(
      "GRADER_SANDBOX_RUNNER_IMAGE_REPOSITORY must be an OCI repository without scheme or digest."
    );
  }
  const lastSegment = value.split("/").at(-1);
  if (lastSegment === undefined || lastSegment.length === 0 || lastSegment.includes(":")) {
    throw new Error(
      "GRADER_SANDBOX_RUNNER_IMAGE_REPOSITORY must not include an image tag."
    );
  }
  return value;
}

export function parseGatewayExecutionProfiles(
  raw: string | undefined
): GraderExecutionProfileRegistry {
  if (raw === undefined || raw.trim().length === 0) {
    return new GraderExecutionProfileRegistry();
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("GRADER_EXECUTION_PROFILES_JSON must contain valid JSON.");
  }
  if (!Array.isArray(parsed)) {
    throw new Error("GRADER_EXECUTION_PROFILES_JSON must contain an array of profiles.");
  }

  return new GraderExecutionProfileRegistry(parsed as GraderExecutionProfile[]);
}

function kubernetesProviderConfig(): KubernetesSandboxProviderConfig {
  return {
    namespace: kubernetesName(
      "GRADER_SANDBOX_NAMESPACE",
      process.env.GRADER_SANDBOX_NAMESPACE?.trim() || "grader-sandbox"
    ),
    runtimeClassName: kubernetesName(
      "GRADER_SANDBOX_RUNTIME_CLASS",
      process.env.GRADER_SANDBOX_RUNTIME_CLASS?.trim() || "gvisor"
    ),
    sandboxServiceAccountName: kubernetesName(
      "GRADER_SANDBOX_SERVICE_ACCOUNT",
      process.env.GRADER_SANDBOX_SERVICE_ACCOUNT?.trim() || "grader-sandbox"
    ),
    runnerImageRepository: imageRepository(required("GRADER_SANDBOX_RUNNER_IMAGE_REPOSITORY")),
    startupTimeoutMs: integer("GRADER_SANDBOX_STARTUP_TIMEOUT_MS", 10_000, {
      min: 1_000,
      max: 60_000
    }),
    pollIntervalMs: integer("GRADER_SANDBOX_POLL_INTERVAL_MS", 250, {
      min: 100,
      max: 5_000
    }),
    resultRetentionSeconds: integer("GRADER_SANDBOX_RESULT_RETENTION_SECONDS", 300, {
      min: 60,
      max: 3_600
    })
  };
}

async function sandboxProvider(): Promise<SandboxProvider> {
  const mode = process.env.GRADER_SANDBOX_PROVIDER?.trim() || "unavailable";
  if (mode === "unavailable") return new UnavailableSandboxProvider();
  if (mode !== "kubernetes-gvisor") {
    throw new Error(
      "GRADER_SANDBOX_PROVIDER must be either unavailable or kubernetes-gvisor."
    );
  }

  const providerConfig = kubernetesProviderConfig();
  const controlPlane = await InClusterKubernetesSandboxControlPlane.fromEnvironment();
  return new KubernetesGvisorSandboxProvider(controlPlane, providerConfig);
}

export async function loadGraderGatewayRuntimeConfig(): Promise<GraderGatewayRuntimeConfig> {
  const serviceToken = required("GRADER_GATEWAY_SERVICE_TOKEN");
  const port = integer("GRADER_GATEWAY_PORT", 4100, { min: 1, max: 65_535 });
  const profileRegistry = parseGatewayExecutionProfiles(
    process.env.GRADER_EXECUTION_PROFILES_JSON
  );

  return {
    port,
    serviceToken,
    profileRegistry,
    sandboxProvider: await sandboxProvider()
  };
}
