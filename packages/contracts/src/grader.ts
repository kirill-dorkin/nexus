import { createHash } from "node:crypto";
import { posix as posixPath } from "node:path";

import { z } from "zod";

export const GRADER_PROTOCOL_VERSION = 1 as const;
export const GRADER_MAX_SOURCE_FILES = 64;
export const GRADER_MAX_SOURCE_BYTES = 1_048_576;
export const GRADER_MAX_FILE_BYTES = 262_144;

const profileKeyPattern = /^[a-z][a-z0-9]*(?:[._-][a-z0-9]+)*$/;
const profileKeyJsonPattern = "^[a-z][a-z0-9]*(?:[._-][a-z0-9]+)*$";
const uuidPattern = "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$";
const jobIdPattern = "^sha256:[0-9a-f]{64}$";
const imageDigestPattern = /^sha256:[0-9a-f]{64}$/;
const providerErrorCodePattern = /^[a-z][a-z0-9_]{0,99}$/;

export const graderProfileReferenceSchema = z
  .object({
    key: z.string().min(2).max(80).regex(profileKeyPattern),
    version: z.number().int().positive()
  })
  .strict();

export type GraderProfileReference = z.infer<typeof graderProfileReferenceSchema>;

export type GraderSourceFile = Readonly<{
  path: string;
  content: string;
}>;

export type GraderJobSpec = Readonly<{
  protocolVersion: typeof GRADER_PROTOCOL_VERSION;
  profile: GraderProfileReference;
  submissionId: string;
  activityVersionId: string;
  source: Readonly<{
    files: readonly GraderSourceFile[];
  }>;
}>;

export type GraderJobRequest = GraderJobSpec &
  Readonly<{
    jobId: string;
  }>;

export type CompletedGraderJobResult = Readonly<{
  protocolVersion: typeof GRADER_PROTOCOL_VERSION;
  jobId: string;
  status: "completed";
  outcome: "passed" | "failed" | "needs_review";
  score: number | null;
  payload: Readonly<Record<string, unknown>>;
}>;

export type SystemErrorGraderJobResult = Readonly<{
  protocolVersion: typeof GRADER_PROTOCOL_VERSION;
  jobId: string;
  status: "system_error";
  error: Readonly<{
    code: string;
    retryable: boolean;
  }>;
}>;

export type GraderJobResult = CompletedGraderJobResult | SystemErrorGraderJobResult;

export class GraderProtocolError extends Error {
  constructor(
    readonly code: string,
    message: string
  ) {
    super(message);
    this.name = "GraderProtocolError";
  }
}

export const graderJobRequestJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "protocolVersion",
    "jobId",
    "profile",
    "submissionId",
    "activityVersionId",
    "source"
  ],
  properties: {
    protocolVersion: { const: GRADER_PROTOCOL_VERSION },
    jobId: { type: "string", pattern: jobIdPattern },
    profile: {
      type: "object",
      additionalProperties: false,
      required: ["key", "version"],
      properties: {
        key: { type: "string", minLength: 2, maxLength: 80, pattern: profileKeyJsonPattern },
        version: { type: "integer", minimum: 1 }
      }
    },
    submissionId: { type: "string", pattern: uuidPattern },
    activityVersionId: { type: "string", pattern: uuidPattern },
    source: {
      type: "object",
      additionalProperties: false,
      required: ["files"],
      properties: {
        files: {
          type: "array",
          minItems: 1,
          maxItems: GRADER_MAX_SOURCE_FILES,
          items: {
            type: "object",
            additionalProperties: false,
            required: ["path", "content"],
            properties: {
              path: { type: "string", minLength: 1, maxLength: 240 },
              content: { type: "string", maxLength: GRADER_MAX_SOURCE_BYTES }
            }
          }
        }
      }
    }
  }
} as const;

function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map((item) => canonicalJson(item)).join(",")}]`;
  }
  if (value !== null && typeof value === "object") {
    const object = value as Record<string, unknown>;
    return `{${Object.keys(object)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalJson(object[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value) ?? "null";
}

function normalizedIdentityMaterial(spec: GraderJobSpec): unknown {
  return {
    protocolVersion: spec.protocolVersion,
    profile: spec.profile,
    submissionId: spec.submissionId.toLowerCase(),
    activityVersionId: spec.activityVersionId.toLowerCase(),
    source: {
      files: [...spec.source.files]
        .map((file) => ({ path: file.path, content: file.content }))
        .sort((left, right) => left.path.localeCompare(right.path))
    }
  };
}

export function buildGraderJobId(spec: GraderJobSpec): string {
  const digest = createHash("sha256")
    .update(canonicalJson(normalizedIdentityMaterial(spec)), "utf8")
    .digest("hex");
  return `sha256:${digest}`;
}

export function sourceByteCount(files: readonly GraderSourceFile[]): number {
  return files.reduce((total, file) => total + Buffer.byteLength(file.content, "utf8"), 0);
}

function validateSourcePath(path: string): void {
  if (
    path.includes("\\") ||
    path.includes("\0") ||
    path.startsWith("/") ||
    path.endsWith("/") ||
    posixPath.normalize(path) !== path ||
    path.split("/").some((segment) => segment === "" || segment === "." || segment === "..")
  ) {
    throw new GraderProtocolError(
      "unsafe_source_path",
      "Source paths must be normalized relative POSIX paths without traversal segments."
    );
  }
}

function validateSourceFiles(files: readonly GraderSourceFile[]): void {
  if (files.length < 1 || files.length > GRADER_MAX_SOURCE_FILES) {
    throw new GraderProtocolError(
      "source_file_count_invalid",
      "Source file count exceeds the gateway transport limit."
    );
  }

  const seen = new Set<string>();
  for (const file of files) {
    if (file.path.length < 1 || file.path.length > 240) {
      throw new GraderProtocolError("unsafe_source_path", "Source file path length is invalid.");
    }
    validateSourcePath(file.path);
    if (seen.has(file.path)) {
      throw new GraderProtocolError(
        "duplicate_source_path",
        "Source file paths must be unique."
      );
    }
    seen.add(file.path);

    if (Buffer.byteLength(file.content, "utf8") > GRADER_MAX_FILE_BYTES) {
      throw new GraderProtocolError(
        "source_file_too_large",
        "A source file exceeds the gateway transport limit."
      );
    }
  }

  if (sourceByteCount(files) > GRADER_MAX_SOURCE_BYTES) {
    throw new GraderProtocolError(
      "source_bundle_too_large",
      "The source bundle exceeds the gateway transport limit."
    );
  }
}

export function extractGraderSourceEnvelope(
  payload: Readonly<Record<string, unknown>>
): GraderJobSpec["source"] {
  const sourceValue = payload.source;
  if (sourceValue === null || typeof sourceValue !== "object" || Array.isArray(sourceValue)) {
    throw new GraderProtocolError(
      "invalid_source_envelope",
      "Executable submissions require payload.source.files."
    );
  }
  const sourceObject = sourceValue as Record<string, unknown>;
  if (!Array.isArray(sourceObject.files)) {
    throw new GraderProtocolError(
      "invalid_source_envelope",
      "Executable submissions require payload.source.files."
    );
  }

  const files: GraderSourceFile[] = sourceObject.files.map((value) => {
    if (value === null || typeof value !== "object" || Array.isArray(value)) {
      throw new GraderProtocolError(
        "invalid_source_envelope",
        "Each executable source file requires path and content strings."
      );
    }
    const file = value as Record<string, unknown>;
    if (
      Object.keys(file).some((key) => key !== "path" && key !== "content") ||
      typeof file.path !== "string" ||
      typeof file.content !== "string"
    ) {
      throw new GraderProtocolError(
        "invalid_source_envelope",
        "Each executable source file requires only path and content strings."
      );
    }
    return { path: file.path, content: file.content };
  });

  validateSourceFiles(files);
  return { files };
}

export function validateGraderJobRequest(request: GraderJobRequest): void {
  validateSourceFiles(request.source.files);

  const expectedJobId = buildGraderJobId(request);
  if (request.jobId !== expectedJobId) {
    throw new GraderProtocolError(
      "job_identity_mismatch",
      "The content-addressed job identity does not match the immutable job specification."
    );
  }
}

function record(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function hasExactKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  return actual.length === expected.length && actual.every((key, index) => key === expected[index]);
}

function invalidProviderResult(): never {
  throw new GraderProtocolError(
    "invalid_provider_result",
    "Sandbox provider returned a result that does not match grader protocol version 1."
  );
}

export function validateGraderJobResult(
  value: unknown,
  expectedJobId: string
): GraderJobResult {
  const result = record(value);
  if (
    result === null ||
    result.protocolVersion !== GRADER_PROTOCOL_VERSION ||
    result.jobId !== expectedJobId ||
    typeof result.status !== "string"
  ) {
    return invalidProviderResult();
  }

  if (result.status === "completed") {
    if (!hasExactKeys(result, ["protocolVersion", "jobId", "status", "outcome", "score", "payload"])) {
      return invalidProviderResult();
    }
    if (!(["passed", "failed", "needs_review"] as const).includes(result.outcome as never)) {
      return invalidProviderResult();
    }
    if (
      result.score !== null &&
      (typeof result.score !== "number" ||
        !Number.isFinite(result.score) ||
        result.score < 0 ||
        result.score > 1)
    ) {
      return invalidProviderResult();
    }
    if (record(result.payload) === null) return invalidProviderResult();
    return result as unknown as CompletedGraderJobResult;
  }

  if (result.status === "system_error") {
    if (!hasExactKeys(result, ["protocolVersion", "jobId", "status", "error"])) {
      return invalidProviderResult();
    }
    const error = record(result.error);
    if (
      error === null ||
      !hasExactKeys(error, ["code", "retryable"]) ||
      typeof error.code !== "string" ||
      !providerErrorCodePattern.test(error.code) ||
      typeof error.retryable !== "boolean"
    ) {
      return invalidProviderResult();
    }
    return result as unknown as SystemErrorGraderJobResult;
  }

  return invalidProviderResult();
}

export const GRADER_PROFILE_HARD_LIMITS = Object.freeze({
  wallTimeMs: 30_000,
  cpuTimeMs: 20_000,
  memoryMiB: 512,
  pids: 64,
  outputBytes: 1_048_576,
  sourceBytes: GRADER_MAX_SOURCE_BYTES,
  sourceFiles: GRADER_MAX_SOURCE_FILES
});

export type GraderExecutionProfile = Readonly<{
  key: string;
  version: number;
  language: Readonly<{
    key: string;
    version: string;
  }>;
  runnerImageDigest: string;
  argv: readonly string[];
  network: "off";
  filesystem: "ephemeral";
  readOnlyRootFilesystem: true;
  limits: Readonly<{
    wallTimeMs: number;
    cpuTimeMs: number;
    memoryMiB: number;
    pids: number;
    outputBytes: number;
    sourceBytes: number;
    sourceFiles: number;
  }>;
}>;

export class InvalidGraderExecutionProfileError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidGraderExecutionProfileError";
  }
}

export class GraderJobResourcePolicyError extends Error {
  readonly code = "resource_policy_rejected";

  constructor(message: string) {
    super(message);
    this.name = "GraderJobResourcePolicyError";
  }
}

const forbiddenShellEntrypoints = new Set([
  "sh",
  "bash",
  "zsh",
  "/bin/sh",
  "/bin/bash",
  "/bin/zsh",
  "cmd",
  "cmd.exe",
  "powershell",
  "powershell.exe",
  "pwsh"
]);

function positiveInteger(value: number): boolean {
  return Number.isInteger(value) && value > 0;
}

function validateLimit(name: keyof typeof GRADER_PROFILE_HARD_LIMITS, value: number): void {
  if (!positiveInteger(value) || value > GRADER_PROFILE_HARD_LIMITS[name]) {
    throw new InvalidGraderExecutionProfileError(
      `${name} must be a positive integer within the gateway hard limit.`
    );
  }
}

function validateProfile(profile: GraderExecutionProfile): void {
  if (!profileKeyPattern.test(profile.key) || profile.key.length > 80 || !positiveInteger(profile.version)) {
    throw new InvalidGraderExecutionProfileError("Profile identity is invalid.");
  }
  if (!profileKeyPattern.test(profile.language.key) || profile.language.version.trim().length === 0) {
    throw new InvalidGraderExecutionProfileError("Profile language/runtime identity is invalid.");
  }
  if (!imageDigestPattern.test(profile.runnerImageDigest)) {
    throw new InvalidGraderExecutionProfileError(
      "Runner image must be pinned by an immutable sha256 digest."
    );
  }
  if (profile.network !== "off") {
    throw new InvalidGraderExecutionProfileError("Sandbox network policy must be off.");
  }
  if (profile.filesystem !== "ephemeral" || profile.readOnlyRootFilesystem !== true) {
    throw new InvalidGraderExecutionProfileError(
      "Sandbox filesystem must be ephemeral with a read-only root filesystem."
    );
  }
  if (profile.argv.length === 0 || profile.argv.length > 16) {
    throw new InvalidGraderExecutionProfileError("Runner argv must contain between 1 and 16 items.");
  }
  for (const argument of profile.argv) {
    if (argument.length === 0 || argument.length > 256 || argument.includes("\0")) {
      throw new InvalidGraderExecutionProfileError("Runner argv contains an invalid item.");
    }
  }
  if (forbiddenShellEntrypoints.has(profile.argv[0] ?? "")) {
    throw new InvalidGraderExecutionProfileError(
      "Runner entrypoint must not delegate execution to a general-purpose shell."
    );
  }

  validateLimit("wallTimeMs", profile.limits.wallTimeMs);
  validateLimit("cpuTimeMs", profile.limits.cpuTimeMs);
  validateLimit("memoryMiB", profile.limits.memoryMiB);
  validateLimit("pids", profile.limits.pids);
  validateLimit("outputBytes", profile.limits.outputBytes);
  validateLimit("sourceBytes", profile.limits.sourceBytes);
  validateLimit("sourceFiles", profile.limits.sourceFiles);

  if (profile.limits.cpuTimeMs > profile.limits.wallTimeMs) {
    throw new InvalidGraderExecutionProfileError(
      "CPU time limit must not exceed wall-clock time limit."
    );
  }
}

export function graderExecutionProfileFingerprint(profile: GraderExecutionProfile): string {
  const stable = JSON.stringify({
    key: profile.key,
    version: profile.version,
    language: profile.language,
    runnerImageDigest: profile.runnerImageDigest,
    argv: profile.argv,
    network: profile.network,
    filesystem: profile.filesystem,
    readOnlyRootFilesystem: profile.readOnlyRootFilesystem,
    limits: profile.limits
  });
  return `sha256:${createHash("sha256").update(stable, "utf8").digest("hex")}`;
}

export type ResolvedGraderExecutionProfile = Readonly<{
  profile: GraderExecutionProfile;
  fingerprint: string;
}>;

export class GraderExecutionProfileRegistry {
  private readonly profiles: Map<string, ResolvedGraderExecutionProfile>;

  constructor(profiles: readonly GraderExecutionProfile[] = []) {
    const resolved = new Map<string, ResolvedGraderExecutionProfile>();
    for (const profile of profiles) {
      validateProfile(profile);
      const identity = `${profile.key}@${profile.version}`;
      if (resolved.has(identity)) {
        throw new InvalidGraderExecutionProfileError(
          `Duplicate grader execution profile ${identity}.`
        );
      }
      resolved.set(identity, {
        profile,
        fingerprint: graderExecutionProfileFingerprint(profile)
      });
    }
    this.profiles = resolved;
  }

  find(reference: GraderProfileReference): ResolvedGraderExecutionProfile | null {
    return this.profiles.get(`${reference.key}@${reference.version}`) ?? null;
  }
}

export function enforceJobResourcePolicy(
  request: GraderJobRequest,
  profile: GraderExecutionProfile
): void {
  if (request.source.files.length > profile.limits.sourceFiles) {
    throw new GraderJobResourcePolicyError(
      "Source file count exceeds the selected server-owned execution profile."
    );
  }
  if (sourceByteCount(request.source.files) > profile.limits.sourceBytes) {
    throw new GraderJobResourcePolicyError(
      "Source bytes exceed the selected server-owned execution profile."
    );
  }
}

function parsePositiveInteger(value: unknown, name: string): number {
  if (typeof value !== "number" || !positiveInteger(value)) {
    throw new InvalidGraderExecutionProfileError(`${name} must be a positive integer.`);
  }
  return value;
}

function parseProfile(value: unknown): GraderExecutionProfile {
  const object = record(value);
  const language = object === null ? null : record(object.language);
  const limits = object === null ? null : record(object.limits);
  if (
    object === null ||
    language === null ||
    limits === null ||
    typeof object.key !== "string" ||
    typeof language.key !== "string" ||
    typeof language.version !== "string" ||
    typeof object.runnerImageDigest !== "string" ||
    !Array.isArray(object.argv) ||
    !object.argv.every((item) => typeof item === "string") ||
    object.network !== "off" ||
    object.filesystem !== "ephemeral" ||
    object.readOnlyRootFilesystem !== true
  ) {
    throw new InvalidGraderExecutionProfileError(
      "Execution profile JSON does not match the server-owned profile contract."
    );
  }

  return {
    key: object.key,
    version: parsePositiveInteger(object.version, "profile.version"),
    language: { key: language.key, version: language.version },
    runnerImageDigest: object.runnerImageDigest,
    argv: object.argv as string[],
    network: "off",
    filesystem: "ephemeral",
    readOnlyRootFilesystem: true,
    limits: {
      wallTimeMs: parsePositiveInteger(limits.wallTimeMs, "limits.wallTimeMs"),
      cpuTimeMs: parsePositiveInteger(limits.cpuTimeMs, "limits.cpuTimeMs"),
      memoryMiB: parsePositiveInteger(limits.memoryMiB, "limits.memoryMiB"),
      pids: parsePositiveInteger(limits.pids, "limits.pids"),
      outputBytes: parsePositiveInteger(limits.outputBytes, "limits.outputBytes"),
      sourceBytes: parsePositiveInteger(limits.sourceBytes, "limits.sourceBytes"),
      sourceFiles: parsePositiveInteger(limits.sourceFiles, "limits.sourceFiles")
    }
  };
}

export function parseGraderExecutionProfilesJson(raw: string | undefined): readonly GraderExecutionProfile[] {
  if (raw === undefined || raw.trim().length === 0) return [];

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new InvalidGraderExecutionProfileError(
      "GRADER_EXECUTION_PROFILES_JSON must contain valid JSON."
    );
  }
  if (!Array.isArray(parsed)) {
    throw new InvalidGraderExecutionProfileError(
      "GRADER_EXECUTION_PROFILES_JSON must contain an array of execution profiles."
    );
  }
  const profiles = parsed.map(parseProfile);
  new GraderExecutionProfileRegistry(profiles);
  return profiles;
}
