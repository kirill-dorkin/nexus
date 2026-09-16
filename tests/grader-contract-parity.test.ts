import { describe, expect, it } from "vitest";

import {
  buildGraderJobId as buildSharedJobId,
  graderExecutionProfileFingerprint as sharedProfileFingerprint,
  type GraderExecutionProfile,
  type GraderJobSpec
} from "../packages/contracts/src/grader";
import { GraderExecutionProfileRegistry } from "../apps/grader-gateway/src/execution-profile";
import { buildGraderJobId as buildGatewayJobId } from "../apps/grader-gateway/src/protocol";

const profile: GraderExecutionProfile = {
  key: "typescript-tests",
  version: 1,
  language: { key: "typescript", version: "5.9" },
  runnerImageDigest: `sha256:${"b".repeat(64)}`,
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

const spec: GraderJobSpec = {
  protocolVersion: 1,
  profile: { key: profile.key, version: profile.version },
  submissionId: "01994fc0-8e4a-7f5c-8d26-dbe90af34021",
  activityVersionId: "01994fc0-8e4a-7f5c-8d26-dbe90af34022",
  source: {
    files: [
      { path: "lib/value.ts", content: "export const value = 42;" },
      { path: "index.ts", content: "export { value } from './lib/value.js';" }
    ]
  }
};

describe("grader contract compatibility", () => {
  it("keeps the shared and Gateway-local content-addressed job identity identical", () => {
    expect(buildSharedJobId(spec)).toBe(buildGatewayJobId(spec));
  });

  it("keeps the shared and Gateway-local execution-profile fingerprint identical", () => {
    const resolved = new GraderExecutionProfileRegistry([profile]).find({
      key: profile.key,
      version: profile.version
    });

    expect(resolved).not.toBeNull();
    expect(sharedProfileFingerprint(profile)).toBe(resolved?.fingerprint);
  });
});
