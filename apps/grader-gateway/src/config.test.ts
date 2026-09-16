import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { loadGraderGatewayRuntimeConfig } from "./config.js";

const serviceToken = "gateway-service-token-that-is-at-least-32-bytes";
const imageDigest = `sha256:${"a".repeat(64)}`;
const tempDirectories: string[] = [];

function credentialFiles(): { tokenFile: string; caFile: string } {
  const directory = mkdtempSync(join(tmpdir(), "grader-k8s-config-"));
  tempDirectories.push(directory);
  const tokenFile = join(directory, "token");
  const caFile = join(directory, "ca.crt");
  writeFileSync(tokenFile, "service-account-token\n", "utf8");
  writeFileSync(caFile, "test-ca-certificate\n", "utf8");
  return { tokenFile, caFile };
}

function profileJson(): string {
  return JSON.stringify([
    {
      key: "typescript-tests",
      version: 1,
      language: { key: "typescript", version: "5.9" },
      runnerImageDigest: imageDigest,
      argv: ["node", "/runner/entry.mjs"],
      network: "off",
      filesystem: "ephemeral",
      readOnlyRootFilesystem: true,
      limits: {
        wallTimeMs: 10_000,
        cpuTimeMs: 5_000,
        memoryMiB: 256,
        pids: 64,
        outputBytes: 65_536,
        sourceBytes: 262_144,
        sourceFiles: 16
      }
    }
  ]);
}

afterEach(() => {
  while (tempDirectories.length > 0) {
    const directory = tempDirectories.pop();
    if (directory !== undefined) rmSync(directory, { recursive: true, force: true });
  }
});

describe("grader gateway runtime config", () => {
  it("keeps execution disabled unless a production provider is explicitly selected", () => {
    const config = loadGraderGatewayRuntimeConfig({
      NODE_ENV: "test",
      GRADER_GATEWAY_SERVICE_TOKEN: serviceToken,
      GRADER_EXECUTION_PROFILES_JSON: profileJson()
    });

    expect(config.sandboxProvider).toEqual({ kind: "unavailable" });
    expect(config.profiles).toHaveLength(1);
    expect(config.port).toBe(4100);
  });

  it("loads the kubernetes-gvisor control plane only from explicit bounded configuration", () => {
    const { tokenFile } = credentialFiles();
    const config = loadGraderGatewayRuntimeConfig({
      NODE_ENV: "test",
      GRADER_GATEWAY_SERVICE_TOKEN: serviceToken,
      GRADER_EXECUTION_PROFILES_JSON: profileJson(),
      GRADER_SANDBOX_PROVIDER: "kubernetes-gvisor",
      GRADER_KUBERNETES_API_URL: "http://127.0.0.1:6443",
      GRADER_KUBERNETES_NAMESPACE: "grader-sandbox",
      GRADER_KUBERNETES_RUNTIME_CLASS: "platform-gvisor",
      GRADER_KUBERNETES_RUNNER_IMAGE_REPOSITORY: "registry.example.com/platform/grader-runner",
      GRADER_KUBERNETES_SERVICE_ACCOUNT_TOKEN_FILE: tokenFile,
      GRADER_KUBERNETES_POD_PIDS_LIMIT: "64",
      GRADER_KUBERNETES_EPHEMERAL_STORAGE_MIB: "96"
    });

    expect(config.sandboxProvider.kind).toBe("kubernetes-gvisor");
    if (config.sandboxProvider.kind !== "kubernetes-gvisor") throw new Error("unexpected provider");
    expect(config.sandboxProvider.config).toMatchObject({
      apiUrl: "http://127.0.0.1:6443",
      namespace: "grader-sandbox",
      runtimeClassName: "platform-gvisor",
      runnerImageRepository: "registry.example.com/platform/grader-runner",
      serviceAccountTokenFile: tokenFile,
      caCertificate: null,
      podPidsLimit: 64,
      ephemeralStorageMiB: 96
    });
  });

  it("requires TLS and a readable CA when kubernetes-gvisor is enabled in production", () => {
    const { tokenFile, caFile } = credentialFiles();
    expect(() =>
      loadGraderGatewayRuntimeConfig({
        NODE_ENV: "production",
        GRADER_GATEWAY_SERVICE_TOKEN: serviceToken,
        GRADER_SANDBOX_PROVIDER: "kubernetes-gvisor",
        GRADER_KUBERNETES_API_URL: "http://127.0.0.1:6443",
        GRADER_KUBERNETES_NAMESPACE: "grader-sandbox",
        GRADER_KUBERNETES_RUNTIME_CLASS: "platform-gvisor",
        GRADER_KUBERNETES_RUNNER_IMAGE_REPOSITORY: "registry.example.com/platform/grader-runner",
        GRADER_KUBERNETES_SERVICE_ACCOUNT_TOKEN_FILE: tokenFile,
        GRADER_KUBERNETES_CA_FILE: caFile
      })
    ).toThrow("must use https in production");

    const config = loadGraderGatewayRuntimeConfig({
      NODE_ENV: "production",
      GRADER_GATEWAY_SERVICE_TOKEN: serviceToken,
      GRADER_SANDBOX_PROVIDER: "kubernetes-gvisor",
      GRADER_KUBERNETES_API_URL: "https://kubernetes.default.svc",
      GRADER_KUBERNETES_NAMESPACE: "grader-sandbox",
      GRADER_KUBERNETES_RUNTIME_CLASS: "platform-gvisor",
      GRADER_KUBERNETES_RUNNER_IMAGE_REPOSITORY: "registry.example.com/platform/grader-runner",
      GRADER_KUBERNETES_SERVICE_ACCOUNT_TOKEN_FILE: tokenFile,
      GRADER_KUBERNETES_CA_FILE: caFile
    });
    expect(config.sandboxProvider.kind).toBe("kubernetes-gvisor");
    if (config.sandboxProvider.kind !== "kubernetes-gvisor") throw new Error("unexpected provider");
    expect(config.sandboxProvider.config.caCertificate).toBe("test-ca-certificate");
  });

  it("rejects unsafe provider locations, image references, PID budgets, and unreadable credentials", () => {
    const { tokenFile } = credentialFiles();
    const base = {
      NODE_ENV: "test",
      GRADER_GATEWAY_SERVICE_TOKEN: serviceToken,
      GRADER_SANDBOX_PROVIDER: "kubernetes-gvisor",
      GRADER_KUBERNETES_NAMESPACE: "grader-sandbox",
      GRADER_KUBERNETES_RUNTIME_CLASS: "platform-gvisor",
      GRADER_KUBERNETES_RUNNER_IMAGE_REPOSITORY: "registry.example.com/platform/grader-runner",
      GRADER_KUBERNETES_SERVICE_ACCOUNT_TOKEN_FILE: tokenFile
    };

    expect(() =>
      loadGraderGatewayRuntimeConfig({
        ...base,
        GRADER_KUBERNETES_API_URL: "http://10.0.0.10:6443"
      })
    ).toThrow("allowed only on loopback");

    expect(() =>
      loadGraderGatewayRuntimeConfig({
        ...base,
        GRADER_KUBERNETES_API_URL: "http://127.0.0.1:6443",
        GRADER_KUBERNETES_RUNNER_IMAGE_REPOSITORY:
          "registry.example.com/platform/grader-runner:latest"
      })
    ).toThrow("untagged OCI repository");

    expect(() =>
      loadGraderGatewayRuntimeConfig({
        ...base,
        GRADER_KUBERNETES_API_URL: "http://127.0.0.1:6443",
        GRADER_KUBERNETES_POD_PIDS_LIMIT: "65"
      })
    ).toThrow("between 1 and 64");

    expect(() =>
      loadGraderGatewayRuntimeConfig({
        ...base,
        GRADER_KUBERNETES_API_URL: "http://127.0.0.1:6443",
        GRADER_KUBERNETES_SERVICE_ACCOUNT_TOKEN_FILE: "/missing/grader-token"
      })
    ).toThrow("could not be read");
  });
});
