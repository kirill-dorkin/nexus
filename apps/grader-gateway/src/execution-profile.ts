import { createHash } from "node:crypto";

import {
  GRADER_MAX_SOURCE_BYTES,
  GRADER_MAX_SOURCE_FILES,
  type GraderJobRequest,
  type GraderProfileReference,
  sourceByteCount
} from "./protocol.js";

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

const keyPattern = /^[a-z][a-z0-9]*(?:[._-][a-z0-9]+)*$/;
const imageDigestPattern = /^sha256:[0-9a-f]{64}$/;
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
  if (!keyPattern.test(profile.key) || profile.key.length > 80 || !positiveInteger(profile.version)) {
    throw new InvalidGraderExecutionProfileError("Profile identity is invalid.");
  }
  if (!keyPattern.test(profile.language.key) || profile.language.version.trim().length === 0) {
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

function fingerprint(profile: GraderExecutionProfile): string {
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
      resolved.set(identity, { profile, fingerprint: fingerprint(profile) });
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
