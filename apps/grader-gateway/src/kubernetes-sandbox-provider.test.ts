import { describe, expect, it } from "vitest";

import {
  GraderExecutionProfileRegistry,
  type GraderExecutionProfile,
  type ResolvedGraderExecutionProfile
} from "./execution-profile.js";
import {
  KubernetesApiError,
  KubernetesGvisorSandboxProvider,
  buildKubernetesSandboxResources,
  type KubernetesSandboxControlPlane,
  type KubernetesSandboxProviderConfig
} from "./kubernetes-sandbox-provider.js";
import { buildGraderJobId, type GraderJobRequest, type GraderJobSpec } from "./protocol.js";

type JsonRecord = Record<string, unknown>;

const config: KubernetesSandboxProviderConfig = {
  namespace: "grader-sandbox",
  runtimeClassName: "gvisor",
  sandboxServiceAccountName: "grader-sandbox",
  runnerImageRepository: "registry.example.test/platform/grader-runner",
  startupTimeoutMs: 1_000,
  pollIntervalMs: 100,
  resultRetentionSeconds: 300
};

function profile(): GraderExecutionProfile {
  return {
    key: "typescript-tests",
    version: 1,
    language: { key: "typescript", version: "5.9" },
    runnerImageDigest: `sha256:${"c".repeat(64)}`,
    argv: ["node", "/runner/entry.mjs"],
    network: "off",
    filesystem: "ephemeral",
    readOnlyRootFilesystem: true,
    limits: {
      wallTimeMs: 10_000,
      cpuTimeMs: 8_000,
      memoryMiB: 256,
      pids: 32,
      outputBytes: 262_144,
      sourceBytes: 512_000,
      sourceFiles: 16
    }
  };
}

function resolvedProfile(): ResolvedGraderExecutionProfile {
  const resolved = new GraderExecutionProfileRegistry([profile()]).find({
    key: "typescript-tests",
    version: 1
  });
  if (resolved === null) throw new Error("Test execution profile was not registered.");
  return resolved;
}

function job(content = "export const secretValue = 42;"): GraderJobRequest {
  const spec: GraderJobSpec = {
    protocolVersion: 1,
    profile: { key: "typescript-tests", version: 1 },
    submissionId: "01994fc0-8e4a-7f5c-8d26-dbe90af34101",
    activityVersionId: "01994fc0-8e4a-7f5c-8d26-dbe90af34102",
    source: { files: [{ path: "src/index.ts", content }] }
  };
  return { ...spec, jobId: buildGraderJobId(spec) };
}

function metadata(value: JsonRecord): JsonRecord {
  const metadataValue = value.metadata;
  if (metadataValue === null || typeof metadataValue !== "object" || Array.isArray(metadataValue)) {
    throw new Error("Test Kubernetes object has no metadata.");
  }
  return metadataValue as JsonRecord;
}

class SuccessfulControlPlane implements KubernetesSandboxControlPlane {
  job: JsonRecord | null = null;
  readonly configMaps: JsonRecord[] = [];
  readonly result: JsonRecord;

  constructor(result: JsonRecord) {
    this.result = result;
  }

  async createJob(_namespace: string, manifest: JsonRecord): Promise<JsonRecord> {
    this.job = {
      ...manifest,
      metadata: { ...metadata(manifest), uid: "01994fc0-8e4a-7f5c-8d26-dbe90af34103" }
    };
    return this.job;
  }

  async getJob(): Promise<JsonRecord> {
    if (this.job === null) throw new Error("Job was not created.");
    return { ...this.job, status: { succeeded: 1 } };
  }

  async createConfigMap(_namespace: string, manifest: JsonRecord): Promise<JsonRecord> {
    this.configMaps.push(manifest);
    return manifest;
  }

  async getConfigMap(): Promise<JsonRecord> {
    throw new Error("ConfigMap replay was not expected.");
  }

  async listPods(): Promise<readonly JsonRecord[]> {
    return [{ metadata: { name: "sandbox-pod" }, status: { phase: "Succeeded" } }];
  }

  async readPodLog(): Promise<string> {
    return JSON.stringify(this.result);
  }
}

describe("Kubernetes gVisor sandbox provider", () => {
  it("builds a digest-pinned, non-root, no-token gVisor Job without embedding learner source", () => {
    const request = job();
    const resolved = resolvedProfile();
    const resources = buildKubernetesSandboxResources(request, resolved, config);

    expect(resources.job).toMatchObject({
      apiVersion: "batch/v1",
      kind: "Job",
      spec: {
        backoffLimit: 0,
        ttlSecondsAfterFinished: 300,
        activeDeadlineSeconds: 10,
        template: {
          spec: {
            runtimeClassName: "gvisor",
            serviceAccountName: "grader-sandbox",
            automountServiceAccountToken: false,
            enableServiceLinks: false,
            hostNetwork: false,
            hostPID: false,
            hostIPC: false,
            securityContext: {
              runAsNonRoot: true,
              seccompProfile: { type: "RuntimeDefault" }
            },
            containers: [
              {
                name: "runner",
                image: `registry.example.test/platform/grader-runner@sha256:${"c".repeat(64)}`,
                command: ["node"],
                args: ["/runner/entry.mjs"],
                securityContext: {
                  runAsNonRoot: true,
                  allowPrivilegeEscalation: false,
                  readOnlyRootFilesystem: true,
                  capabilities: { drop: ["ALL"] }
                },
                resources: {
                  limits: {
                    cpu: "1",
                    memory: "256Mi",
                    "ephemeral-storage": "512Mi"
                  }
                }
              }
            ],
            volumes: [
              { name: "source", projected: { defaultMode: 292 } },
              { name: "scratch", emptyDir: { sizeLimit: "512Mi" } }
            ]
          }
        }
      }
    });
    expect(JSON.stringify(resources.job)).not.toContain("secretValue");
    expect(resources.sourceConfigMaps).toHaveLength(1);
    expect(resources.sourceConfigMaps[0]).toMatchObject({
      immutable: true,
      data: { f0: "export const secretValue = 42;" }
    });
  });

  it("returns trusted runner protocol output and owner-binds source objects to the deterministic Job", async () => {
    const request = job();
    const result = {
      protocolVersion: 1,
      jobId: request.jobId,
      status: "completed",
      outcome: "passed",
      score: 1,
      payload: { tests: 4 }
    };
    const controlPlane = new SuccessfulControlPlane(result);
    const provider = new KubernetesGvisorSandboxProvider(controlPlane, config);

    await expect(provider.execute(request, resolvedProfile())).resolves.toEqual(result);
    expect(controlPlane.configMaps).toHaveLength(1);
    expect(controlPlane.configMaps[0]).toMatchObject({
      metadata: {
        ownerReferences: [
          {
            apiVersion: "batch/v1",
            kind: "Job",
            name: expect.stringMatching(/^grader-g-[0-9a-f]{40}$/),
            uid: "01994fc0-8e4a-7f5c-8d26-dbe90af34103",
            controller: false,
            blockOwnerDeletion: false
          }
        ]
      }
    });
  });

  it("maps unschedulable capacity to retryable system_error", async () => {
    const request = job();
    class CapacityControlPlane extends SuccessfulControlPlane {
      override async getJob(): Promise<JsonRecord> {
        if (this.job === null) throw new Error("Job was not created.");
        return { ...this.job, status: { active: 1 } };
      }

      override async listPods(): Promise<readonly JsonRecord[]> {
        return [
          {
            metadata: { name: "sandbox-pod" },
            status: {
              conditions: [
                {
                  type: "PodScheduled",
                  status: "False",
                  reason: "Unschedulable"
                }
              ]
            }
          }
        ];
      }
    }

    const controlPlane = new CapacityControlPlane({});
    const provider = new KubernetesGvisorSandboxProvider(controlPlane, config);
    await expect(provider.execute(request, resolvedProfile())).resolves.toEqual({
      protocolVersion: 1,
      jobId: request.jobId,
      status: "system_error",
      error: { code: "sandbox_capacity_unavailable", retryable: true }
    });
  });

  it("fails closed when a deterministic Job name is already bound to different profile material", async () => {
    const request = job();
    const resolved = resolvedProfile();
    const desired = buildKubernetesSandboxResources(request, resolved, config).job;
    const desiredMetadata = metadata(desired);
    const annotations = desiredMetadata.annotations as JsonRecord;

    class ConflictingControlPlane extends SuccessfulControlPlane {
      override async createJob(): Promise<JsonRecord> {
        throw new KubernetesApiError(409, "AlreadyExists");
      }

      override async getJob(): Promise<JsonRecord> {
        return {
          ...desired,
          metadata: {
            ...desiredMetadata,
            uid: "01994fc0-8e4a-7f5c-8d26-dbe90af34104",
            annotations: {
              ...annotations,
              "grader.platform.dev/profile-fingerprint": `sha256:${"d".repeat(64)}`
            }
          }
        };
      }
    }

    const provider = new KubernetesGvisorSandboxProvider(
      new ConflictingControlPlane({}),
      config
    );
    await expect(provider.execute(request, resolved)).resolves.toEqual({
      protocolVersion: 1,
      jobId: request.jobId,
      status: "system_error",
      error: { code: "sandbox_identity_conflict", retryable: false }
    });
  });
});
