import { describe, expect, it } from "vitest";

import {
  GraderExecutionProfileRegistry,
  GraderJobResourcePolicyError,
  InvalidGraderExecutionProfileError,
  enforceJobResourcePolicy,
  type GraderExecutionProfile
} from "./execution-profile.js";
import {
  buildGraderJobId,
  type GraderJobRequest,
  type GraderJobSpec
} from "./protocol.js";

function profile(
  overrides: Partial<GraderExecutionProfile> = {}
): GraderExecutionProfile {
  return {
    key: "typescript-tests",
    version: 1,
    language: { key: "typescript", version: "5.9" },
    runnerImageDigest: `sha256:${"a".repeat(64)}`,
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
    },
    ...overrides
  };
}

function request(content: string): GraderJobRequest {
  const spec: GraderJobSpec = {
    protocolVersion: 1,
    profile: { key: "typescript-tests", version: 1 },
    submissionId: "01994fc0-8e4a-7f5c-8d26-dbe90af34011",
    activityVersionId: "01994fc0-8e4a-7f5c-8d26-dbe90af34012",
    source: { files: [{ path: "index.ts", content }] }
  };
  return { ...spec, jobId: buildGraderJobId(spec) };
}

describe("Grader execution profile registry", () => {
  it("accepts an exact server-owned safe profile and resolves it by version", () => {
    const registry = new GraderExecutionProfileRegistry([profile()]);
    const resolved = registry.find({ key: "typescript-tests", version: 1 });

    expect(resolved?.profile.runnerImageDigest).toBe(
      `sha256:${"a".repeat(64)}`
    );
    expect(resolved?.fingerprint).toMatch(/^sha256:[0-9a-f]{64}$/);
    expect(registry.find({ key: "typescript-tests", version: 2 })).toBeNull();
  });

  it("rejects network access, mutable image identity, shell entrypoints, and oversized resources", () => {
    const unsafe = [
      profile({ network: "on" as GraderExecutionProfile["network"] }),
      profile({ runnerImageDigest: "latest" }),
      profile({ argv: ["bash", "-lc", "node index.js"] }),
      profile({
        limits: {
          ...profile().limits,
          memoryMiB: 1024
        }
      })
    ];

    for (const candidate of unsafe) {
      expect(() => new GraderExecutionProfileRegistry([candidate])).toThrow(
        InvalidGraderExecutionProfileError
      );
    }
  });

  it("rejects a job whose source exceeds the selected profile even within transport bounds", () => {
    const restricted = profile({
      limits: {
        ...profile().limits,
        sourceBytes: 8
      }
    });

    expect(() =>
      enforceJobResourcePolicy(request("123456789"), restricted)
    ).toThrow(GraderJobResourcePolicyError);
  });
});
