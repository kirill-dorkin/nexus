import { createServer, type IncomingMessage, type ServerResponse, type Server } from "node:http";

import {
  GraderExecutionProfileRegistry,
  buildGraderJobId,
  type GraderExecutionProfile,
  type GraderJobRequest,
  type GraderJobSpec
} from "@platform/contracts/grader";
import { afterEach, describe, expect, it } from "vitest";

import type { KubernetesGvisorProviderConfig } from "./config.js";
import { KubernetesGvisorSandboxProvider } from "./kubernetes-gvisor-sandbox-provider.js";

const imageDigest = `sha256:${"b".repeat(64)}`;
const serviceAccountToken = "kubernetes-service-account-token";
const namespace = "grader-sandbox";

function sourceRequest(): GraderJobRequest {
  const spec: GraderJobSpec = {
    protocolVersion: 1,
    profile: { key: "typescript-tests", version: 1 },
    submissionId: "018f3fd0-7b5f-7a1a-9bf8-b80979358022",
    activityVersionId: "018f3fd0-7b5f-7a1a-9bf8-b80979358023",
    source: {
      files: [
        { path: "src/index.ts", content: "export const answer = 42;" },
        { path: "src/math.ts", content: "export const add = (a: number, b: number) => a + b;" }
      ]
    }
  };
  return { ...spec, jobId: buildGraderJobId(spec) };
}

function resolvedProfile(pids = 64) {
  const value: GraderExecutionProfile = {
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
      pids,
      outputBytes: 65_536,
      sourceBytes: 262_144,
      sourceFiles: 16
    }
  };
  const resolved = new GraderExecutionProfileRegistry([value]).find({
    key: value.key,
    version: value.version
  });
  if (resolved === null) throw new Error("test profile did not resolve");
  return resolved;
}

function config(apiUrl: string): KubernetesGvisorProviderConfig {
  return {
    apiUrl,
    namespace,
    runtimeClassName: "platform-gvisor",
    runnerImageRepository: "registry.example.com/platform/grader-runner",
    serviceAccountToken,
    caCertificate: null,
    pollIntervalMs: 10,
    requestTimeoutMs: 1_000,
    startupGraceMs: 2_000,
    cleanupTtlSeconds: 300,
    ephemeralStorageMiB: 96,
    podPidsLimit: 64
  };
}

async function readJsonBody(request: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8")) as unknown;
}

function object(value: unknown): Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("expected object");
  }
  return value as Record<string, unknown>;
}

function json(response: ServerResponse, status: number, body: unknown): void {
  response.writeHead(status, { "content-type": "application/json" });
  response.end(JSON.stringify(body));
}

async function listen(server: Server): Promise<string> {
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => resolve());
  });
  const address = server.address();
  if (address === null || typeof address === "string") throw new Error("fake API did not bind");
  return `http://127.0.0.1:${address.port}`;
}

function close(server: Server): Promise<void> {
  return new Promise<void>((resolve, reject) =>
    server.close((error) => (error === undefined ? resolve() : reject(error)))
  );
}

describe("Kubernetes gVisor sandbox provider", () => {
  const cleanup: Array<() => Promise<void>> = [];

  afterEach(async () => {
    while (cleanup.length > 0) await cleanup.pop()?.();
  });

  it("creates a hardened deterministic Job and keeps learner source only in owner-referenced Secrets", async () => {
    const request = sourceRequest();
    const profile = resolvedProfile();
    let storedJob: Record<string, unknown> | null = null;
    const secrets = new Map<string, Record<string, unknown>>();
    let successfulJobCreates = 0;

    const server = createServer(async (incoming, response) => {
      if (incoming.headers.authorization !== `Bearer ${serviceAccountToken}`) {
        json(response, 401, { message: "unauthorized" });
        return;
      }
      const url = new URL(incoming.url ?? "/", "http://127.0.0.1");
      const jobsBase = `/apis/batch/v1/namespaces/${namespace}/jobs`;
      const secretsBase = `/api/v1/namespaces/${namespace}/secrets`;

      if (incoming.method === "POST" && url.pathname === jobsBase) {
        const body = object(await readJsonBody(incoming));
        if (storedJob !== null) {
          json(response, 409, { message: "already exists" });
          return;
        }
        const metadata = object(body.metadata);
        storedJob = { ...body, metadata: { ...metadata, uid: "job-uid-1" } };
        successfulJobCreates += 1;
        json(response, 201, storedJob);
        return;
      }
      if (incoming.method === "GET" && url.pathname.startsWith(`${jobsBase}/`)) {
        if (storedJob === null) {
          json(response, 404, { message: "not found" });
          return;
        }
        json(response, 200, {
          ...storedJob,
          status: { conditions: [{ type: "Complete", status: "True", reason: "CompletionsReached" }] }
        });
        return;
      }
      if (incoming.method === "POST" && url.pathname === secretsBase) {
        const body = object(await readJsonBody(incoming));
        const metadata = object(body.metadata);
        const name = metadata.name;
        if (typeof name !== "string") throw new Error("secret name missing");
        if (secrets.has(name)) {
          json(response, 409, { message: "already exists" });
          return;
        }
        const stored = { ...body, metadata: { ...metadata, uid: `${name}-uid` } };
        secrets.set(name, stored);
        json(response, 201, stored);
        return;
      }
      if (incoming.method === "GET" && url.pathname.startsWith(`${secretsBase}/`)) {
        const name = decodeURIComponent(url.pathname.slice(secretsBase.length + 1));
        const stored = secrets.get(name);
        if (stored === undefined) {
          json(response, 404, { message: "not found" });
          return;
        }
        json(response, 200, stored);
        return;
      }
      if (incoming.method === "GET" && url.pathname === `/api/v1/namespaces/${namespace}/pods`) {
        json(response, 200, { items: [{ metadata: { name: "grader-pod-1" }, status: { phase: "Succeeded" } }] });
        return;
      }
      if (incoming.method === "GET" && url.pathname === `/api/v1/namespaces/${namespace}/pods/grader-pod-1/log`) {
        json(response, 200, {
          protocolVersion: 1,
          jobId: request.jobId,
          status: "completed",
          outcome: "passed",
          score: 1,
          payload: { tests: 4 }
        });
        return;
      }
      json(response, 404, { message: `${incoming.method} ${url.pathname} not handled` });
    });
    const apiUrl = await listen(server);
    cleanup.push(() => close(server));

    const provider = new KubernetesGvisorSandboxProvider(config(apiUrl));
    await expect(provider.execute(request, profile)).resolves.toMatchObject({
      jobId: request.jobId,
      status: "completed",
      outcome: "passed"
    });

    const job = object(storedJob);
    const serializedJob = JSON.stringify(job);
    for (const file of request.source.files) expect(serializedJob).not.toContain(file.content);

    const spec = object(job.spec);
    expect(spec).toMatchObject({ backoffLimit: 0, ttlSecondsAfterFinished: 300 });
    const podSpec = object(object(spec.template).spec);
    expect(podSpec).toMatchObject({
      runtimeClassName: "platform-gvisor",
      restartPolicy: "Never",
      automountServiceAccountToken: false,
      enableServiceLinks: false,
      hostNetwork: false,
      hostPID: false,
      hostIPC: false
    });
    const containers = podSpec.containers as unknown[];
    expect(containers).toHaveLength(1);
    expect(object(containers[0])).toMatchObject({
      name: "runner",
      image: `registry.example.com/platform/grader-runner@${imageDigest}`,
      command: ["node"],
      args: ["/runner/entry.mjs"],
      resources: {
        requests: { cpu: "500m", memory: "256Mi", "ephemeral-storage": "96Mi" },
        limits: { cpu: "500m", memory: "256Mi", "ephemeral-storage": "96Mi" }
      },
      securityContext: {
        privileged: false,
        allowPrivilegeEscalation: false,
        readOnlyRootFilesystem: true,
        runAsNonRoot: true,
        capabilities: { drop: ["ALL"] }
      }
    });

    expect(secrets.size).toBe(2);
    for (const [index, secret] of [...secrets.values()].entries()) {
      const secretMetadata = object(secret.metadata);
      expect(secretMetadata.ownerReferences).toEqual([
        expect.objectContaining({ kind: "Job", name: object(job.metadata).name, uid: "job-uid-1" })
      ]);
      expect(Buffer.from(String(object(secret.data).content), "base64").toString("utf8")).toBe(
        request.source.files[index]?.content
      );
    }

    await expect(provider.execute(request, profile)).resolves.toMatchObject({
      jobId: request.jobId,
      status: "completed"
    });
    expect(successfulJobCreates).toBe(1);
  });

  it("fails before Kubernetes when profile PID semantics do not match the dedicated node envelope", async () => {
    let requests = 0;
    const server = createServer((_incoming, response) => {
      requests += 1;
      json(response, 500, { message: "unexpected" });
    });
    const apiUrl = await listen(server);
    cleanup.push(() => close(server));
    const request = sourceRequest();
    const provider = new KubernetesGvisorSandboxProvider(config(apiUrl));

    await expect(provider.execute(request, resolvedProfile(32))).resolves.toEqual({
      protocolVersion: 1,
      jobId: request.jobId,
      status: "system_error",
      error: { code: "sandbox_profile_pid_limit_mismatch", retryable: false }
    });
    expect(requests).toBe(0);
  });

  it("fails closed when a deterministic Kubernetes Job has conflicting immutable identity", async () => {
    const request = sourceRequest();
    const server = createServer(async (incoming, response) => {
      const url = new URL(incoming.url ?? "/", "http://127.0.0.1");
      const jobsBase = `/apis/batch/v1/namespaces/${namespace}/jobs`;
      if (incoming.method === "POST" && url.pathname === jobsBase) {
        await readJsonBody(incoming);
        json(response, 409, { message: "already exists" });
        return;
      }
      if (incoming.method === "GET" && url.pathname.startsWith(`${jobsBase}/`)) {
        json(response, 200, {
          metadata: {
            name: url.pathname.slice(jobsBase.length + 1),
            uid: "foreign-job-uid",
            annotations: {
              "grader.platform.internal/job-id": request.jobId,
              "grader.platform.internal/profile-fingerprint": `sha256:${"f".repeat(64)}`,
              "grader.platform.internal/spec-fingerprint": `sha256:${"e".repeat(64)}`
            }
          }
        });
        return;
      }
      json(response, 404, { message: "not found" });
    });
    const apiUrl = await listen(server);
    cleanup.push(() => close(server));

    const provider = new KubernetesGvisorSandboxProvider(config(apiUrl));
    await expect(provider.execute(request, resolvedProfile())).resolves.toEqual({
      protocolVersion: 1,
      jobId: request.jobId,
      status: "system_error",
      error: { code: "sandbox_resource_conflict", retryable: false }
    });
  });
});
