import { createHash } from "node:crypto";
import { posix as posixPath } from "node:path";

export const GRADER_PROTOCOL_VERSION = 1 as const;
export const GRADER_MAX_SOURCE_FILES = 64;
export const GRADER_MAX_SOURCE_BYTES = 1_048_576;
export const GRADER_MAX_FILE_BYTES = 262_144;

const profileKeyPattern = "^[a-z][a-z0-9]*(?:[._-][a-z0-9]+)*$";
const uuidPattern = "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$";
const jobIdPattern = "^sha256:[0-9a-f]{64}$";
const providerErrorCodePattern = /^[a-z][a-z0-9_]{0,99}$/;

export type GraderProfileReference = Readonly<{
  key: string;
  version: number;
}>;

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
        key: { type: "string", minLength: 2, maxLength: 80, pattern: profileKeyPattern },
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

export function validateGraderJobRequest(request: GraderJobRequest): void {
  const seen = new Set<string>();
  for (const file of request.source.files) {
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

  if (sourceByteCount(request.source.files) > GRADER_MAX_SOURCE_BYTES) {
    throw new GraderProtocolError(
      "source_bundle_too_large",
      "The source bundle exceeds the gateway transport limit."
    );
  }

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
