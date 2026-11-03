import { createHash } from "node:crypto";

import type {
  GraderJobRequest,
  ResolvedGraderExecutionProfile,
  SystemErrorGraderJobResult
} from "@platform/contracts/grader";

import {
  GRADER_GVISOR_RUNTIME_CLASS,
  GRADER_SANDBOX_NAMESPACE,
  GRADER_SANDBOX_RUNNER_SERVICE_ACCOUNT,
  type KubernetesGvisorProviderConfig
} from "./config.js";
import {
  KubernetesApiClient,
  KubernetesApiError,
  KubernetesApiTransportError
} from "./kubernetes-api.client.js";
import { SandboxProvider } from "./sandbox-provider.js";

const MANAGED_LABEL = "grader.platform.internal/managed";
const JOB_FRAGMENT_LABEL = "grader.platform.internal/job-fragment";
const JOB_ID_ANNOTATION = "grader.platform.internal/job-id";
const PROFILE_FINGERPRINT_ANNOTATION = "grader.platform.internal/profile-fingerprint";
const SPEC_FINGERPRINT_ANNOTATION = "grader.platform.internal/spec-fingerprint";
const RUNNER_CONTAINER_NAME = "runner";
const SOURCE_VOLUME_NAME = "source";
const SCRATCH_VOLUME_NAME = "scratch";
const SOURCE_MOUNT_PATH = "/workspace/source";
const SCRATCH_MOUNT_PATH = "/workspace/tmp";
const SANDBOX_UID = 65_532;
const OUTER_CPU = "1";
const TERMINATION_GRACE_SECONDS = 1;

class SandboxResourceConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SandboxResourceConflictError";
  }
}

type JobIdentity = Readonly<{
  name: string;
  sourceSecretNames: readonly string[];
  specFingerprint: string;
}>;

type KubernetesMetadata = Readonly<{
  name: string;
  uid: string;
  annotations: Readonly<Record<string, string>>;
}>;

function record(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function stringRecord(value: unknown): Record<string, string> {
  const object = record(value);
  if (object === null) return {};
  const entries = Object.entries(object).filter((entry): entry is [string, string] =>
    typeof entry[1] === "string"
  );
  return Object.fromEntries(entries);
}

function metadata(value: unknown): KubernetesMetadata {
  const object = record(value);
  const meta = object === null ? null : record(object.metadata);
  if (meta === null || typeof meta.name !== "string" || typeof meta.uid !== "string") {
    throw new SandboxResourceConflictError("Kubernetes resource metadata was incomplete.");
  }
  return {
    name: meta.name,
    uid: meta.uid,
    annotations: stringRecord(meta.annotations)
  };
}

function systemError(
  jobId: string,
  code: string,
  retryable: boolean
): SystemErrorGraderJobResult {
  return {
    protocolVersion: 1,
    jobId,
    status: "system_error",
    error: { code, retryable }
  };
}

function sleep(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function jobName(jobId: string): string {
  return `grader-${jobId.slice("sha256:".length, "sha256:".length + 48)}`;
}

function sourceSecretName(jobNameValue: string, index: number): string {
  return `${jobNameValue}-s${String(index).padStart(2, "0")}`;
}

function stableFingerprint(value: unknown): string {
  return `sha256:${createHash("sha256").update(JSON.stringify(value), "utf8").digest("hex")}`;
}

function jobIdentity(
  request: GraderJobRequest,
  profile: ResolvedGraderExecutionProfile,
  config: KubernetesGvisorProviderConfig
): JobIdentity {
  const name = jobName(request.jobId);
  const sourceSecretNames = request.source.files.map((_, index) => sourceSecretName(name, index));
  const signature = {
    jobId: request.jobId,
    profileFingerprint: profile.fingerprint,
    namespace: GRADER_SANDBOX_NAMESPACE,
    runtimeClassName: GRADER_GVISOR_RUNTIME_CLASS,
    runnerServiceAccountName: GRADER_SANDBOX_RUNNER_SERVICE_ACCOUNT,
    image: `${config.runnerImageRepository}@${profile.profile.runnerImageDigest}`,
    argv: profile.profile.argv,
    wallTimeMs: profile.profile.limits.wallTimeMs,
    cpuTimeMs: profile.profile.limits.cpuTimeMs,
    cpuEnvelope: OUTER_CPU,
    memoryMiB: profile.profile.limits.memoryMiB,
    pids: profile.profile.limits.pids,
    outputBytes: profile.profile.limits.outputBytes,
    ephemeralStorageMiB: config.ephemeralStorageMiB,
    terminationGraceSeconds: TERMINATION_GRACE_SECONDS,
    sourceSecretNames
  };
  return { name, sourceSecretNames, specFingerprint: stableFingerprint(signature) };
}

function buildJob(
  request: GraderJobRequest,
  profile: ResolvedGraderExecutionProfile,
  identity: JobIdentity,
  config: KubernetesGvisorProviderConfig
): unknown {
  const activeDeadlineSeconds = Math.ceil(
    (profile.profile.limits.wallTimeMs + config.startupGraceMs) / 1_000
  );
  const memory = `${profile.profile.limits.memoryMiB}Mi`;
  const ephemeralStorage = `${config.ephemeralStorageMiB}Mi`;
  const projectedSources = request.source.files.map((file, index) => ({
    secret: {
      name: identity.sourceSecretNames[index],
      items: [{ key: "content", path: file.path, mode: 292 }]
    }
  }));

  return {
    apiVersion: "batch/v1",
    kind: "Job",
    metadata: {
      name: identity.name,
      namespace: GRADER_SANDBOX_NAMESPACE,
      labels: {
        [MANAGED_LABEL]: "true",
        [JOB_FRAGMENT_LABEL]: request.jobId.slice("sha256:".length, "sha256:".length + 48)
      },
      annotations: {
        [JOB_ID_ANNOTATION]: request.jobId,
        [PROFILE_FINGERPRINT_ANNOTATION]: profile.fingerprint,
        [SPEC_FINGERPRINT_ANNOTATION]: identity.specFingerprint
      }
    },
    spec: {
      parallelism: 1,
      completions: 1,
      completionMode: "NonIndexed",
      backoffLimit: 0,
      activeDeadlineSeconds,
      ttlSecondsAfterFinished: config.cleanupTtlSeconds,
      template: {
        metadata: {
          labels: {
            [MANAGED_LABEL]: "true",
            [JOB_FRAGMENT_LABEL]: request.jobId.slice("sha256:".length, "sha256:".length + 48)
          },
          annotations: {
            [JOB_ID_ANNOTATION]: request.jobId,
            [PROFILE_FINGERPRINT_ANNOTATION]: profile.fingerprint,
            [SPEC_FINGERPRINT_ANNOTATION]: identity.specFingerprint
          }
        },
        spec: {
          runtimeClassName: GRADER_GVISOR_RUNTIME_CLASS,
          serviceAccountName: GRADER_SANDBOX_RUNNER_SERVICE_ACCOUNT,
          restartPolicy: "Never",
          terminationGracePeriodSeconds: TERMINATION_GRACE_SECONDS,
          automountServiceAccountToken: false,
          enableServiceLinks: false,
          hostNetwork: false,
          hostPID: false,
          hostIPC: false,
          securityContext: {
            runAsNonRoot: true,
            runAsUser: SANDBOX_UID,
            runAsGroup: SANDBOX_UID,
            fsGroup: SANDBOX_UID,
            seccompProfile: { type: "RuntimeDefault" }
          },
          containers: [
            {
              name: RUNNER_CONTAINER_NAME,
              image: `${config.runnerImageRepository}@${profile.profile.runnerImageDigest}`,
              imagePullPolicy: "IfNotPresent",
              command: [profile.profile.argv[0]],
              args: profile.profile.argv.slice(1),
              env: [
                { name: "GRADER_JOB_ID", value: request.jobId },
                { name: "GRADER_SOURCE_ROOT", value: SOURCE_MOUNT_PATH },
                { name: "GRADER_SCRATCH_ROOT", value: SCRATCH_MOUNT_PATH },
                {
                  name: "GRADER_WALL_TIME_MS",
                  value: String(profile.profile.limits.wallTimeMs)
                },
                {
                  name: "GRADER_CPU_TIME_MS",
                  value: String(profile.profile.limits.cpuTimeMs)
                },
                { name: "GRADER_PIDS", value: String(profile.profile.limits.pids) },
                {
                  name: "GRADER_OUTPUT_BYTES",
                  value: String(profile.profile.limits.outputBytes)
                }
              ],
              resources: {
                requests: {
                  cpu: OUTER_CPU,
                  memory,
                  "ephemeral-storage": ephemeralStorage
                },
                limits: {
                  cpu: OUTER_CPU,
                  memory,
                  "ephemeral-storage": ephemeralStorage
                }
              },
              securityContext: {
                privileged: false,
                allowPrivilegeEscalation: false,
                readOnlyRootFilesystem: true,
                runAsNonRoot: true,
                runAsUser: SANDBOX_UID,
                runAsGroup: SANDBOX_UID,
                capabilities: { drop: ["ALL"] }
              },
              volumeMounts: [
                {
                  name: SOURCE_VOLUME_NAME,
                  mountPath: SOURCE_MOUNT_PATH,
                  readOnly: true
                },
                {
                  name: SCRATCH_VOLUME_NAME,
                  mountPath: SCRATCH_MOUNT_PATH
                }
              ]
            }
          ],
          volumes: [
            {
              name: SOURCE_VOLUME_NAME,
              projected: {
                defaultMode: 292,
                sources: projectedSources
              }
            },
            {
              name: SCRATCH_VOLUME_NAME,
              emptyDir: { sizeLimit: ephemeralStorage }
            }
          ]
        }
      }
    }
  };
}

function buildSourceSecret(
  fileContent: string,
  name: string,
  jobMetadata: KubernetesMetadata,
  request: GraderJobRequest,
  profile: ResolvedGraderExecutionProfile
): unknown {
  return {
    apiVersion: "v1",
    kind: "Secret",
    metadata: {
      name,
      namespace: GRADER_SANDBOX_NAMESPACE,
      labels: { [MANAGED_LABEL]: "true" },
      annotations: {
        [JOB_ID_ANNOTATION]: request.jobId,
        [PROFILE_FINGERPRINT_ANNOTATION]: profile.fingerprint
      },
      ownerReferences: [
        {
          apiVersion: "batch/v1",
          kind: "Job",
          name: jobMetadata.name,
          uid: jobMetadata.uid,
          controller: true
        }
      ]
    },
    immutable: true,
    type: "Opaque",
    data: { content: Buffer.from(fileContent, "utf8").toString("base64") }
  };
}

function jobApiPath(name?: string): string {
  const base = `/apis/batch/v1/namespaces/${encodeURIComponent(GRADER_SANDBOX_NAMESPACE)}/jobs`;
  return name === undefined ? base : `${base}/${encodeURIComponent(name)}`;
}

function secretApiPath(name?: string): string {
  const base = `/api/v1/namespaces/${encodeURIComponent(GRADER_SANDBOX_NAMESPACE)}/secrets`;
  return name === undefined ? base : `${base}/${encodeURIComponent(name)}`;
}

function podsApiPath(jobNameValue: string): string {
  return `/api/v1/namespaces/${encodeURIComponent(GRADER_SANDBOX_NAMESPACE)}/pods?labelSelector=${encodeURIComponent(`job-name=${jobNameValue}`)}`;
}

function podLogPath(podName: string): string {
  return `/api/v1/namespaces/${encodeURIComponent(GRADER_SANDBOX_NAMESPACE)}/pods/${encodeURIComponent(podName)}/log?container=${RUNNER_CONTAINER_NAME}`;
}

function assertJobIdentity(
  value: unknown,
  request: GraderJobRequest,
  profile: ResolvedGraderExecutionProfile,
  identity: JobIdentity
): KubernetesMetadata {
  const meta = metadata(value);
  if (
    meta.name !== identity.name ||
    meta.annotations[JOB_ID_ANNOTATION] !== request.jobId ||
    meta.annotations[PROFILE_FINGERPRINT_ANNOTATION] !== profile.fingerprint ||
    meta.annotations[SPEC_FINGERPRINT_ANNOTATION] !== identity.specFingerprint
  ) {
    throw new SandboxResourceConflictError(
      "Existing Kubernetes grader Job does not match immutable grader identity."
    );
  }
  return meta;
}

function hasExactJobOwner(
  ownerReferences: unknown,
  expectedName: string,
  expectedUid: string
): boolean {
  if (!Array.isArray(ownerReferences)) return false;
  return ownerReferences.map(record).some(
    (owner) =>
      owner?.apiVersion === "batch/v1" &&
      owner.kind === "Job" &&
      owner.name === expectedName &&
      owner.uid === expectedUid &&
      owner.controller === true
  );
}

function assertSecretIdentity(
  value: unknown,
  expectedName: string,
  expectedOwnerName: string,
  expectedOwnerUid: string,
  expectedContentBase64: string,
  request: GraderJobRequest,
  profile: ResolvedGraderExecutionProfile
): void {
  const object = record(value);
  const meta = object === null ? null : record(object.metadata);
  const annotations = meta === null ? {} : stringRecord(meta.annotations);
  const data = object === null ? null : record(object.data);
  if (
    meta?.name !== expectedName ||
    annotations[JOB_ID_ANNOTATION] !== request.jobId ||
    annotations[PROFILE_FINGERPRINT_ANNOTATION] !== profile.fingerprint ||
    !hasExactJobOwner(meta.ownerReferences, expectedOwnerName, expectedOwnerUid) ||
    data?.content !== expectedContentBase64
  ) {
    throw new SandboxResourceConflictError(
      "Existing Kubernetes source Secret does not match immutable grader input."
    );
  }
}

function terminalCondition(
  value: unknown
): Readonly<{ type: "Complete" | "Failed"; reason: string }> | null {
  const object = record(value);
  const status = object === null ? null : record(object.status);
  const conditions = status === null || !Array.isArray(status.conditions) ? [] : status.conditions;
  for (const conditionValue of conditions) {
    const condition = record(conditionValue);
    if (
      condition !== null &&
      condition.status === "True" &&
      (condition.type === "Complete" || condition.type === "Failed")
    ) {
      return {
        type: condition.type,
        reason: typeof condition.reason === "string" ? condition.reason : "unknown"
      };
    }
  }
  return null;
}

function succeededPodName(
  value: unknown,
  expectedJobName: string,
  expectedJobUid: string
): string | null {
  const object = record(value);
  if (object === null || !Array.isArray(object.items)) return null;
  const succeeded = object.items.filter((item) => {
    const pod = record(item);
    const status = pod === null ? null : record(pod.status);
    const meta = pod === null ? null : record(pod.metadata);
    return (
      status?.phase === "Succeeded" &&
      meta !== null &&
      hasExactJobOwner(meta.ownerReferences, expectedJobName, expectedJobUid)
    );
  });
  if (succeeded.length !== 1) return null;
  const pod = record(succeeded[0]);
  const meta = pod === null ? null : record(pod.metadata);
  return meta !== null && typeof meta.name === "string" ? meta.name : null;
}

function failureFor(error: unknown, jobId: string): SystemErrorGraderJobResult {
  if (error instanceof SandboxResourceConflictError) {
    return systemError(jobId, "sandbox_resource_conflict", false);
  }
  if (error instanceof KubernetesApiTransportError) {
    if (error.code === "response_too_large") {
      return systemError(jobId, "sandbox_control_plane_response_too_large", false);
    }
    return systemError(jobId, "sandbox_control_plane_unavailable", true);
  }
  if (error instanceof KubernetesApiError) {
    if (error.statusCode === 401) {
      return systemError(jobId, "sandbox_control_plane_auth", true);
    }
    if (error.statusCode === 403) {
      return systemError(jobId, "sandbox_control_plane_forbidden", true);
    }
    if (error.statusCode === 404) {
      return systemError(jobId, "sandbox_resource_unavailable", true);
    }
    if (error.statusCode === 409) {
      return systemError(jobId, "sandbox_resource_conflict", false);
    }
    if (error.statusCode === 422) {
      return systemError(jobId, "sandbox_policy_rejected", false);
    }
    if (error.statusCode === 429) {
      return systemError(jobId, "sandbox_capacity", true);
    }
    if (
      error.statusCode === 408 ||
      error.statusCode === 425 ||
      error.statusCode >= 500
    ) {
      return systemError(jobId, "sandbox_control_plane_unavailable", true);
    }
    return systemError(jobId, "sandbox_control_plane_rejected", false);
  }
  return systemError(jobId, "sandbox_provider_failure", true);
}

export class KubernetesGvisorSandboxProvider extends SandboxProvider {
  private readonly api: KubernetesApiClient;

  constructor(
    private readonly config: KubernetesGvisorProviderConfig,
    api?: KubernetesApiClient
  ) {
    super();
    this.api =
      api ??
      new KubernetesApiClient({
        apiUrl: config.apiUrl,
        serviceAccountTokenFile: config.serviceAccountTokenFile,
        caCertificate: config.caCertificate,
        requestTimeoutMs: config.requestTimeoutMs
      });
  }

  private async createOrFindJob(
    request: GraderJobRequest,
    profile: ResolvedGraderExecutionProfile,
    identity: JobIdentity
  ): Promise<Readonly<{ metadata: KubernetesMetadata; created: boolean }>> {
    try {
      const created = await this.api.postJson(
        jobApiPath(),
        buildJob(request, profile, identity, this.config)
      );
      return { metadata: assertJobIdentity(created, request, profile, identity), created: true };
    } catch (error) {
      if (!(error instanceof KubernetesApiError) || error.statusCode !== 409) throw error;
      const existing = await this.api.getJson(jobApiPath(identity.name));
      return { metadata: assertJobIdentity(existing, request, profile, identity), created: false };
    }
  }

  private async createOrVerifySources(
    request: GraderJobRequest,
    profile: ResolvedGraderExecutionProfile,
    identity: JobIdentity,
    jobMetadata: KubernetesMetadata
  ): Promise<void> {
    for (const [index, file] of request.source.files.entries()) {
      const name = identity.sourceSecretNames[index];
      if (name === undefined) {
        throw new SandboxResourceConflictError("Source Secret identity was not generated.");
      }
      const body = buildSourceSecret(file.content, name, jobMetadata, request, profile);
      try {
        await this.api.postJson(secretApiPath(), body);
      } catch (error) {
        if (!(error instanceof KubernetesApiError) || error.statusCode !== 409) throw error;
        const existing = await this.api.getJson(secretApiPath(name));
        assertSecretIdentity(
          existing,
          name,
          jobMetadata.name,
          jobMetadata.uid,
          Buffer.from(file.content, "utf8").toString("base64"),
          request,
          profile
        );
      }
    }
  }

  private async resultFromCompletedJob(
    request: GraderJobRequest,
    profile: ResolvedGraderExecutionProfile,
    identity: JobIdentity,
    jobUid: string
  ): Promise<unknown> {
    const pods = await this.api.getJson(podsApiPath(identity.name));
    const podName = succeededPodName(pods, identity.name, jobUid);
    if (podName === null) {
      return systemError(request.jobId, "sandbox_result_pod_unavailable", true);
    }

    let text: string;
    try {
      text = await this.api.getText(
        podLogPath(podName),
        profile.profile.limits.outputBytes
      );
    } catch (error) {
      if (error instanceof KubernetesApiTransportError && error.code === "response_too_large") {
        return systemError(request.jobId, "sandbox_runner_output_limit", false);
      }
      throw error;
    }
    const trimmed = text.trim();
    if (trimmed.length === 0) {
      return systemError(request.jobId, "sandbox_runner_missing_result", false);
    }
    try {
      return JSON.parse(trimmed) as unknown;
    } catch {
      return systemError(request.jobId, "sandbox_runner_invalid_output", false);
    }
  }

  private async waitForTerminal(
    request: GraderJobRequest,
    profile: ResolvedGraderExecutionProfile,
    identity: JobIdentity
  ): Promise<unknown> {
    const deadline =
      Date.now() +
      profile.profile.limits.wallTimeMs +
      this.config.startupGraceMs +
      this.config.requestTimeoutMs +
      TERMINATION_GRACE_SECONDS * 1_000;
    while (Date.now() <= deadline) {
      const job = await this.api.getJson(jobApiPath(identity.name));
      const jobMetadata = assertJobIdentity(job, request, profile, identity);
      const terminal = terminalCondition(job);
      if (terminal?.type === "Complete") {
        return this.resultFromCompletedJob(request, profile, identity, jobMetadata.uid);
      }
      if (terminal?.type === "Failed") {
        if (terminal.reason === "DeadlineExceeded") {
          return systemError(request.jobId, "sandbox_outer_timeout", true);
        }
        return systemError(request.jobId, "sandbox_job_failed", true);
      }
      await sleep(this.config.pollIntervalMs);
    }
    return systemError(request.jobId, "sandbox_control_plane_timeout", true);
  }

  async execute(
    request: GraderJobRequest,
    profile: ResolvedGraderExecutionProfile
  ): Promise<unknown> {
    if (profile.profile.limits.pids !== this.config.podPidsLimit) {
      return systemError(request.jobId, "sandbox_profile_pid_limit_mismatch", false);
    }

    const identity = jobIdentity(request, profile, this.config);
    let created = false;
    try {
      const job = await this.createOrFindJob(request, profile, identity);
      created = job.created;
      await this.createOrVerifySources(request, profile, identity, job.metadata);
      return await this.waitForTerminal(request, profile, identity);
    } catch (error) {
      if (created) {
        try {
          await this.api.delete(jobApiPath(identity.name));
        } catch {
          // The Job TTL/owner-reference lifecycle remains the cleanup fallback.
        }
      }
      return failureFor(error, request.jobId);
    }
  }
}