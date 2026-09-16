import { readFile } from "node:fs/promises";
import { request as httpsRequest } from "node:https";

import type { ResolvedGraderExecutionProfile } from "./execution-profile.js";
import type { GraderJobRequest, GraderJobResult } from "./protocol.js";
import { SandboxProvider } from "./sandbox-provider.js";

const JOB_ID_ANNOTATION = "grader.platform.dev/job-id";
const PROFILE_FINGERPRINT_ANNOTATION = "grader.platform.dev/profile-fingerprint";
const SOURCE_CHUNK_ANNOTATION = "grader.platform.dev/source-chunk";
const JOB_KEY_LABEL = "grader.platform.dev/job-key";
const MAX_CONFIG_MAP_SOURCE_BYTES = 450_000;
const MAX_KUBERNETES_RESPONSE_BYTES = 2_500_000;

export type KubernetesSandboxProviderConfig = Readonly<{
  namespace: string;
  runtimeClassName: string;
  sandboxServiceAccountName: string;
  runnerImageRepository: string;
  startupTimeoutMs: number;
  pollIntervalMs: number;
  resultRetentionSeconds: number;
}>;

type JsonRecord = Record<string, unknown>;

export class KubernetesApiError extends Error {
  constructor(
    readonly statusCode: number,
    message: string
  ) {
    super(message);
    this.name = "KubernetesApiError";
  }
}

export interface KubernetesSandboxControlPlane {
  createJob(namespace: string, manifest: JsonRecord): Promise<JsonRecord>;
  getJob(namespace: string, name: string): Promise<JsonRecord>;
  createConfigMap(namespace: string, manifest: JsonRecord): Promise<JsonRecord>;
  getConfigMap(namespace: string, name: string): Promise<JsonRecord>;
  listPods(namespace: string, labelSelector: string): Promise<readonly JsonRecord[]>;
  readPodLog(namespace: string, podName: string, limitBytes: number): Promise<string>;
}

type InClusterClientOptions = Readonly<{
  host: string;
  port: number;
  token: string;
  ca: Buffer;
  requestTimeoutMs: number;
}>;

function isRecord(value: unknown): value is JsonRecord {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function pathSegment(value: string): string {
  return encodeURIComponent(value);
}

function positiveInteger(value: string | undefined, fallback: number): number {
  if (value === undefined || value.trim().length === 0) return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0 || parsed > 65_535) {
    throw new Error("Kubernetes service port must be an integer between 1 and 65535.");
  }
  return parsed;
}

async function readResponseBody(
  response: AsyncIterable<string | Buffer | Uint8Array>,
  maxBytes: number
): Promise<Buffer> {
  const chunks: Buffer[] = [];
  let total = 0;
  for await (const raw of response) {
    const chunk = Buffer.isBuffer(raw) ? raw : Buffer.from(raw);
    total += chunk.byteLength;
    if (total > maxBytes) {
      throw new Error("Kubernetes API response exceeded the control-plane response limit.");
    }
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

export class InClusterKubernetesSandboxControlPlane implements KubernetesSandboxControlPlane {
  private constructor(private readonly options: InClusterClientOptions) {}

  static async fromEnvironment(
    requestTimeoutMs: number
  ): Promise<InClusterKubernetesSandboxControlPlane> {
    const host = process.env.KUBERNETES_SERVICE_HOST?.trim();
    if (host === undefined || host.length === 0) {
      throw new Error("KUBERNETES_SERVICE_HOST is required for kubernetes-gvisor sandboxing.");
    }

    const tokenPath =
      process.env.GRADER_KUBERNETES_TOKEN_PATH?.trim() ||
      "/var/run/secrets/kubernetes.io/serviceaccount/token";
    const caPath =
      process.env.GRADER_KUBERNETES_CA_PATH?.trim() ||
      "/var/run/secrets/kubernetes.io/serviceaccount/ca.crt";
    const [token, ca] = await Promise.all([readFile(tokenPath, "utf8"), readFile(caPath)]);
    if (token.trim().length === 0) {
      throw new Error("Kubernetes service-account token is empty.");
    }

    return new InClusterKubernetesSandboxControlPlane({
      host,
      port: positiveInteger(process.env.KUBERNETES_SERVICE_PORT_HTTPS, 443),
      token: token.trim(),
      ca,
      requestTimeoutMs
    });
  }

  private async call(
    method: "GET" | "POST",
    path: string,
    body?: JsonRecord,
    responseLimitBytes = MAX_KUBERNETES_RESPONSE_BYTES,
    accept = "application/json"
  ): Promise<unknown> {
    const encoded = body === undefined ? undefined : Buffer.from(JSON.stringify(body), "utf8");

    return new Promise((resolve, reject) => {
      const request = httpsRequest(
        {
          hostname: this.options.host,
          port: this.options.port,
          method,
          path,
          ca: this.options.ca,
          headers: {
            authorization: `Bearer ${this.options.token}`,
            accept,
            ...(encoded === undefined
              ? {}
              : {
                  "content-type": "application/json",
                  "content-length": String(encoded.byteLength)
                })
          }
        },
        (response) => {
          void (async () => {
            try {
              const payload = await readResponseBody(response, responseLimitBytes);
              const statusCode = response.statusCode ?? 500;
              if (statusCode < 200 || statusCode >= 300) {
                let message = `Kubernetes API returned HTTP ${statusCode}.`;
                try {
                  const parsed = JSON.parse(payload.toString("utf8")) as unknown;
                  if (isRecord(parsed) && typeof parsed.message === "string") {
                    message = parsed.message;
                  }
                } catch {
                  // Preserve the generic status-only message; never log response bodies here.
                }
                reject(new KubernetesApiError(statusCode, message));
                return;
              }

              if (accept === "text/plain") {
                resolve(payload.toString("utf8"));
                return;
              }
              if (payload.byteLength === 0) {
                resolve({});
                return;
              }
              resolve(JSON.parse(payload.toString("utf8")) as unknown);
            } catch (error) {
              reject(error);
            }
          })();
        }
      );
      request.once("error", reject);
      request.setTimeout(this.options.requestTimeoutMs, () => {
        request.destroy(new Error("Kubernetes API request timed out."));
      });
      if (encoded !== undefined) request.write(encoded);
      request.end();
    });
  }

  private async objectCall(method: "GET" | "POST", path: string, body?: JsonRecord) {
    const value = await this.call(method, path, body);
    if (!isRecord(value)) throw new Error("Kubernetes API returned a non-object response.");
    return value;
  }

  createJob(namespace: string, manifest: JsonRecord): Promise<JsonRecord> {
    return this.objectCall(
      "POST",
      `/apis/batch/v1/namespaces/${pathSegment(namespace)}/jobs`,
      manifest
    );
  }

  getJob(namespace: string, name: string): Promise<JsonRecord> {
    return this.objectCall(
      "GET",
      `/apis/batch/v1/namespaces/${pathSegment(namespace)}/jobs/${pathSegment(name)}`
    );
  }

  createConfigMap(namespace: string, manifest: JsonRecord): Promise<JsonRecord> {
    return this.objectCall(
      "POST",
      `/api/v1/namespaces/${pathSegment(namespace)}/configmaps`,
      manifest
    );
  }

  getConfigMap(namespace: string, name: string): Promise<JsonRecord> {
    return this.objectCall(
      "GET",
      `/api/v1/namespaces/${pathSegment(namespace)}/configmaps/${pathSegment(name)}`
    );
  }

  async listPods(namespace: string, labelSelector: string): Promise<readonly JsonRecord[]> {
    const value = await this.call(
      "GET",
      `/api/v1/namespaces/${pathSegment(namespace)}/pods?labelSelector=${encodeURIComponent(labelSelector)}`
    );
    if (!isRecord(value) || !Array.isArray(value.items)) {
      throw new Error("Kubernetes pod list response is invalid.");
    }
    return value.items.filter(isRecord);
  }

  async readPodLog(namespace: string, podName: string, limitBytes: number): Promise<string> {
    const value = await this.call(
      "GET",
      `/api/v1/namespaces/${pathSegment(namespace)}/pods/${pathSegment(podName)}/log?container=runner&limitBytes=${limitBytes}`,
      undefined,
      limitBytes + 16_384,
      "text/plain"
    );
    if (typeof value !== "string") throw new Error("Kubernetes pod log response is invalid.");
    return value;
  }
}

type SourceChunk = Readonly<{
  name: string;
  data: Readonly<Record<string, string>>;
  items: readonly Readonly<{ key: string; path: string }>[];
}>;

export type KubernetesSandboxResources = Readonly<{
  jobName: string;
  job: JsonRecord;
  sourceConfigMaps: readonly JsonRecord[];
}>;

function digestPart(jobId: string): string {
  return jobId.slice("sha256:".length);
}

function jobNameFor(jobId: string): string {
  return `grader-g-${digestPart(jobId).slice(0, 40)}`;
}

function jobKeyFor(jobId: string): string {
  return digestPart(jobId).slice(0, 52);
}

function utf8Bytes(value: string): number {
  return Buffer.byteLength(value, "utf8");
}

function partitionSource(request: GraderJobRequest, jobName: string): readonly SourceChunk[] {
  const chunks: Array<{
    name: string;
    data: Record<string, string>;
    items: Array<{ key: string; path: string }>;
    bytes: number;
  }> = [];

  for (const [fileIndex, file] of request.source.files.entries()) {
    const bytes = utf8Bytes(file.content);
    let chunk = chunks.at(-1);
    if (chunk === undefined || chunk.bytes + bytes > MAX_CONFIG_MAP_SOURCE_BYTES) {
      chunk = {
        name: `${jobName}-src-${chunks.length}`,
        data: {},
        items: [],
        bytes: 0
      };
      chunks.push(chunk);
    }
    const key = `f${fileIndex}`;
    chunk.data[key] = file.content;
    chunk.items.push({ key, path: file.path });
    chunk.bytes += bytes;
  }

  return chunks.map(({ name, data, items }) => ({ name, data, items }));
}

function ephemeralStorageMiB(profile: ResolvedGraderExecutionProfile): number {
  return Math.min(1024, Math.max(128, profile.profile.limits.memoryMiB * 2));
}

function imageReference(repository: string, digest: string): string {
  return `${repository}@${digest}`;
}

function annotations(request: GraderJobRequest, profile: ResolvedGraderExecutionProfile) {
  return {
    [JOB_ID_ANNOTATION]: request.jobId,
    [PROFILE_FINGERPRINT_ANNOTATION]: profile.fingerprint
  };
}

export function buildKubernetesSandboxResources(
  request: GraderJobRequest,
  profile: ResolvedGraderExecutionProfile,
  config: KubernetesSandboxProviderConfig
): KubernetesSandboxResources {
  const jobName = jobNameFor(request.jobId);
  const jobKey = jobKeyFor(request.jobId);
  const chunks = partitionSource(request, jobName);
  const diskMiB = ephemeralStorageMiB(profile);
  const profileLimits = profile.profile.limits;
  const ownerAnnotations = annotations(request, profile);
  const entrypoint = profile.profile.argv[0];
  if (entrypoint === undefined) {
    throw new Error("Resolved grader execution profile has no runner entrypoint.");
  }

  const sourceConfigMaps = chunks.map((chunk, index) => ({
    apiVersion: "v1",
    kind: "ConfigMap",
    metadata: {
      name: chunk.name,
      namespace: config.namespace,
      annotations: {
        ...ownerAnnotations,
        [SOURCE_CHUNK_ANNOTATION]: String(index)
      },
      labels: { [JOB_KEY_LABEL]: jobKey }
    },
    immutable: true,
    data: chunk.data
  }));

  const projectedSources = chunks.map((chunk) => ({
    configMap: {
      name: chunk.name,
      items: chunk.items
    }
  }));

  const job: JsonRecord = {
    apiVersion: "batch/v1",
    kind: "Job",
    metadata: {
      name: jobName,
      namespace: config.namespace,
      annotations: ownerAnnotations,
      labels: { [JOB_KEY_LABEL]: jobKey }
    },
    spec: {
      backoffLimit: 0,
      ttlSecondsAfterFinished: config.resultRetentionSeconds,
      activeDeadlineSeconds: Math.max(
        1,
        Math.ceil((config.startupTimeoutMs + profileLimits.wallTimeMs) / 1000)
      ),
      template: {
        metadata: {
          labels: { [JOB_KEY_LABEL]: jobKey }
        },
        spec: {
          runtimeClassName: config.runtimeClassName,
          restartPolicy: "Never",
          terminationGracePeriodSeconds: 1,
          serviceAccountName: config.sandboxServiceAccountName,
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
              image: imageReference(config.runnerImageRepository, profile.profile.runnerImageDigest),
              imagePullPolicy: "IfNotPresent",
              command: [entrypoint],
              args: profile.profile.argv.slice(1),
              env: [
                { name: "PLATFORM_GRADER_JOB_ID", value: request.jobId },
                { name: "PLATFORM_GRADER_SOURCE_DIR", value: "/workspace" },
                { name: "PLATFORM_GRADER_SCRATCH_DIR", value: "/scratch" },
                { name: "PLATFORM_GRADER_WALL_TIME_MS", value: String(profileLimits.wallTimeMs) },
                { name: "PLATFORM_GRADER_CPU_TIME_MS", value: String(profileLimits.cpuTimeMs) },
                { name: "PLATFORM_GRADER_PID_LIMIT", value: String(profileLimits.pids) },
                { name: "PLATFORM_GRADER_OUTPUT_BYTES", value: String(profileLimits.outputBytes) },
                { name: "TMPDIR", value: "/scratch/tmp" },
                { name: "HOME", value: "/scratch/home" }
              ],
              securityContext: {
                runAsNonRoot: true,
                allowPrivilegeEscalation: false,
                readOnlyRootFilesystem: true,
                capabilities: { drop: ["ALL"] },
                seccompProfile: { type: "RuntimeDefault" }
              },
              resources: {
                requests: {
                  cpu: "100m",
                  memory: `${profileLimits.memoryMiB}Mi`,
                  "ephemeral-storage": "64Mi"
                },
                limits: {
                  cpu: "1",
                  memory: `${profileLimits.memoryMiB}Mi`,
                  "ephemeral-storage": `${diskMiB}Mi`
                }
              },
              volumeMounts: [
                { name: "source", mountPath: "/workspace", readOnly: true },
                { name: "scratch", mountPath: "/scratch" }
              ]
            }
          ],
          volumes: [
            {
              name: "source",
              projected: {
                defaultMode: 292,
                sources: projectedSources
              }
            },
            {
              name: "scratch",
              emptyDir: { sizeLimit: `${diskMiB}Mi` }
            }
          ]
        }
      }
    }
  };

  return { jobName, job, sourceConfigMaps };
}

function nestedRecord(value: JsonRecord, key: string): JsonRecord | null {
  const child = value[key];
  return isRecord(child) ? child : null;
}

function metadata(value: JsonRecord): JsonRecord | null {
  return nestedRecord(value, "metadata");
}

function objectName(value: JsonRecord): string | null {
  const name = metadata(value)?.name;
  return typeof name === "string" ? name : null;
}

function objectUid(value: JsonRecord): string | null {
  const uid = metadata(value)?.uid;
  return typeof uid === "string" ? uid : null;
}

function objectAnnotations(value: JsonRecord): JsonRecord | null {
  const annotationsValue = metadata(value)?.annotations;
  return isRecord(annotationsValue) ? annotationsValue : null;
}

function annotation(value: JsonRecord, key: string): string | null {
  const candidate = objectAnnotations(value)?.[key];
  return typeof candidate === "string" ? candidate : null;
}

function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (isRecord(value)) {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value) ?? "null";
}

function desiredContainer(job: JsonRecord): JsonRecord | null {
  const spec = nestedRecord(job, "spec");
  const template = spec === null ? null : nestedRecord(spec, "template");
  const pod = template === null ? null : nestedRecord(template, "spec");
  const containers = pod?.containers;
  return Array.isArray(containers) && isRecord(containers[0]) ? containers[0] : null;
}

function desiredPodSpec(job: JsonRecord): JsonRecord | null {
  const spec = nestedRecord(job, "spec");
  const template = spec === null ? null : nestedRecord(spec, "template");
  return template === null ? null : nestedRecord(template, "spec");
}

function sameJobIdentity(existing: JsonRecord, desired: JsonRecord): boolean {
  const desiredAnnotations = objectAnnotations(desired);
  const existingPod = desiredPodSpec(existing);
  const desiredPod = desiredPodSpec(desired);
  const existingContainer = desiredContainer(existing);
  const wantedContainer = desiredContainer(desired);
  return (
    desiredAnnotations !== null &&
    annotation(existing, JOB_ID_ANNOTATION) === desiredAnnotations[JOB_ID_ANNOTATION] &&
    annotation(existing, PROFILE_FINGERPRINT_ANNOTATION) ===
      desiredAnnotations[PROFILE_FINGERPRINT_ANNOTATION] &&
    existingPod?.runtimeClassName === desiredPod?.runtimeClassName &&
    existingPod?.serviceAccountName === desiredPod?.serviceAccountName &&
    existingContainer?.image === wantedContainer?.image &&
    canonicalJson(existingContainer?.command) === canonicalJson(wantedContainer?.command) &&
    canonicalJson(existingContainer?.args) === canonicalJson(wantedContainer?.args)
  );
}

function sameConfigMapIdentity(existing: JsonRecord, desired: JsonRecord): boolean {
  return (
    annotation(existing, JOB_ID_ANNOTATION) === annotation(desired, JOB_ID_ANNOTATION) &&
    annotation(existing, PROFILE_FINGERPRINT_ANNOTATION) ===
      annotation(desired, PROFILE_FINGERPRINT_ANNOTATION) &&
    annotation(existing, SOURCE_CHUNK_ANNOTATION) === annotation(desired, SOURCE_CHUNK_ANNOTATION) &&
    canonicalJson(existing.data) === canonicalJson(desired.data)
  );
}

function attachOwnerReference(configMap: JsonRecord, job: JsonRecord): JsonRecord {
  const uid = objectUid(job);
  const name = objectName(job);
  if (uid === null || name === null) {
    throw new Error("Kubernetes Job response is missing immutable owner identity.");
  }
  const currentMetadata = metadata(configMap);
  if (currentMetadata === null) throw new Error("ConfigMap manifest is missing metadata.");
  return {
    ...configMap,
    metadata: {
      ...currentMetadata,
      ownerReferences: [
        {
          apiVersion: "batch/v1",
          kind: "Job",
          name,
          uid,
          controller: false,
          blockOwnerDeletion: false
        }
      ]
    }
  };
}

function systemError(jobId: string, code: string, retryable: boolean): GraderJobResult {
  return {
    protocolVersion: 1,
    jobId,
    status: "system_error",
    error: { code, retryable }
  };
}

function isConflict(error: unknown): error is KubernetesApiError {
  return error instanceof KubernetesApiError && error.statusCode === 409;
}

function providerError(jobId: string, error: unknown): GraderJobResult {
  if (error instanceof KubernetesApiError) {
    if (error.statusCode === 401 || error.statusCode === 403) {
      return systemError(jobId, "sandbox_provider_forbidden", false);
    }
    if (error.statusCode === 429 || error.statusCode >= 500) {
      return systemError(jobId, "sandbox_provider_unavailable", true);
    }
  }
  return systemError(jobId, "sandbox_provider_failure", true);
}

async function ensureJob(
  controlPlane: KubernetesSandboxControlPlane,
  namespace: string,
  desired: JsonRecord,
  name: string
): Promise<JsonRecord> {
  try {
    return await controlPlane.createJob(namespace, desired);
  } catch (error) {
    if (!isConflict(error)) throw error;
    const existing = await controlPlane.getJob(namespace, name);
    if (!sameJobIdentity(existing, desired)) {
      throw new Error("Existing Kubernetes sandbox Job conflicts with grader job identity.");
    }
    return existing;
  }
}

async function ensureConfigMap(
  controlPlane: KubernetesSandboxControlPlane,
  namespace: string,
  desired: JsonRecord
): Promise<void> {
  try {
    await controlPlane.createConfigMap(namespace, desired);
  } catch (error) {
    if (!isConflict(error)) throw error;
    const name = objectName(desired);
    if (name === null) throw new Error("Source ConfigMap name is missing.");
    const existing = await controlPlane.getConfigMap(namespace, name);
    if (!sameConfigMapIdentity(existing, desired)) {
      throw new Error("Existing source ConfigMap conflicts with grader job identity.");
    }
  }
}

function jobState(job: JsonRecord): "succeeded" | "failed" | "active" {
  const status = nestedRecord(job, "status");
  if (status !== null) {
    if (typeof status.succeeded === "number" && status.succeeded > 0) return "succeeded";
    if (typeof status.failed === "number" && status.failed > 0) return "failed";
  }
  return "active";
}

function jobFailureReason(job: JsonRecord): string | null {
  const status = nestedRecord(job, "status");
  const conditions = status?.conditions;
  if (!Array.isArray(conditions)) return null;
  for (const value of conditions) {
    if (!isRecord(value) || value.status !== "True") continue;
    if (value.type === "Failed" && typeof value.reason === "string") return value.reason;
  }
  return null;
}

function podFailureResult(jobId: string, pod: JsonRecord | undefined): GraderJobResult | null {
  if (pod === undefined) return null;
  const status = nestedRecord(pod, "status");
  if (status === null) return null;

  const conditions = status.conditions;
  if (Array.isArray(conditions)) {
    for (const condition of conditions) {
      if (
        isRecord(condition) &&
        condition.type === "PodScheduled" &&
        condition.status === "False" &&
        condition.reason === "Unschedulable"
      ) {
        return systemError(jobId, "sandbox_capacity_unavailable", true);
      }
    }
  }

  const statuses = status.containerStatuses;
  if (!Array.isArray(statuses)) return null;
  for (const containerStatus of statuses) {
    if (!isRecord(containerStatus)) continue;
    const state = isRecord(containerStatus.state) ? containerStatus.state : null;
    const waiting = state !== null && isRecord(state.waiting) ? state.waiting : null;
    const waitingReason = waiting?.reason;
    if (
      waitingReason === "ErrImagePull" ||
      waitingReason === "ImagePullBackOff" ||
      waitingReason === "InvalidImageName"
    ) {
      return systemError(jobId, "sandbox_image_unavailable", false);
    }
    const terminated = state !== null && isRecord(state.terminated) ? state.terminated : null;
    if (terminated?.reason === "OOMKilled") {
      return systemError(jobId, "sandbox_memory_limit_exceeded", false);
    }
  }
  return null;
}

function sleep(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

export class KubernetesGvisorSandboxProvider extends SandboxProvider {
  constructor(
    private readonly controlPlane: KubernetesSandboxControlPlane,
    private readonly config: KubernetesSandboxProviderConfig
  ) {
    super();
  }

  async execute(
    request: GraderJobRequest,
    profile: ResolvedGraderExecutionProfile
  ): Promise<unknown> {
    let resources: KubernetesSandboxResources;
    try {
      resources = buildKubernetesSandboxResources(request, profile, this.config);
    } catch {
      return systemError(request.jobId, "sandbox_profile_invalid", false);
    }

    let job: JsonRecord;
    try {
      job = await ensureJob(
        this.controlPlane,
        this.config.namespace,
        resources.job,
        resources.jobName
      );
      const sourceWithOwners = resources.sourceConfigMaps.map((configMap) =>
        attachOwnerReference(configMap, job)
      );
      for (const configMap of sourceWithOwners) {
        await ensureConfigMap(this.controlPlane, this.config.namespace, configMap);
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes("conflicts with grader job identity")) {
        return systemError(request.jobId, "sandbox_identity_conflict", false);
      }
      return providerError(request.jobId, error);
    }

    const deadline =
      Date.now() + this.config.startupTimeoutMs + profile.profile.limits.wallTimeMs;
    const selector = `${JOB_KEY_LABEL}=${jobKeyFor(request.jobId)}`;
    let lastPod: JsonRecord | undefined;

    while (Date.now() <= deadline) {
      try {
        job = await this.controlPlane.getJob(this.config.namespace, resources.jobName);
        const pods = await this.controlPlane.listPods(this.config.namespace, selector);
        lastPod = pods[0] ?? lastPod;

        const podFailure = podFailureResult(request.jobId, lastPod);
        if (podFailure !== null) return podFailure;

        const state = jobState(job);
        if (state === "succeeded") {
          const podName = lastPod === undefined ? null : objectName(lastPod);
          if (podName === null) {
            await sleep(this.config.pollIntervalMs);
            continue;
          }
          const log = await this.controlPlane.readPodLog(
            this.config.namespace,
            podName,
            profile.profile.limits.outputBytes + 1
          );
          if (utf8Bytes(log) > profile.profile.limits.outputBytes) {
            return systemError(request.jobId, "sandbox_output_limit_exceeded", false);
          }
          try {
            return JSON.parse(log.trim()) as unknown;
          } catch {
            return systemError(request.jobId, "sandbox_runner_invalid_output", false);
          }
        }

        if (state === "failed") {
          if (jobFailureReason(job) === "DeadlineExceeded") {
            return systemError(request.jobId, "sandbox_job_deadline_exceeded", false);
          }
          return (
            podFailureResult(request.jobId, lastPod) ??
            systemError(request.jobId, "sandbox_execution_failed", false)
          );
        }
      } catch (error) {
        return providerError(request.jobId, error);
      }

      await sleep(this.config.pollIntervalMs);
    }

    return systemError(request.jobId, "sandbox_control_timeout", true);
  }
}
