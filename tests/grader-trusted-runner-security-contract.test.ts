import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  GraderExecutionProfileRegistry,
  parseGraderExecutionProfilesJson
} from "@platform/contracts/grader";
import { describe, expect, it } from "vitest";

import { loadGraderGatewayRuntimeConfig } from "../apps/grader-gateway/src/config";

const PROFILE_PATH = resolve("infra/grader/execution-profiles/js-sum-v1-v1.json");

function text(path: string): string {
  return readFileSync(resolve(path), "utf8");
}

function canonicalProfiles() {
  return parseGraderExecutionProfilesJson(readFileSync(PROFILE_PATH, "utf8"));
}

describe("trusted grader runner security contract", () => {
  it("pins the first executable profile to the CI-proven immutable runner artifact", () => {
    const profiles = canonicalProfiles();
    expect(profiles).toHaveLength(1);
    expect(() => new GraderExecutionProfileRegistry(profiles)).not.toThrow();

    const profile = profiles[0]!;
    expect(profile.key).toBe("js-sum-v1");
    expect(profile.version).toBe(1);
    expect(profile.runnerImageDigest).toBe(
      "sha256:0d22faa894b6bb73347dddef5c19ec5240c06ac893c6e9d5791fb9621edcb9d5"
    );
    expect(profile.argv).toEqual(["/grader-runner", "js-sum-v1"]);
    expect(profile.network).toBe("off");
    expect(profile.filesystem).toBe("ephemeral");
    expect(profile.readOnlyRootFilesystem).toBe(true);
    expect(profile.limits).toEqual({
      wallTimeMs: 2000,
      cpuTimeMs: 1000,
      memoryMiB: 128,
      pids: 64,
      outputBytes: 65536,
      sourceBytes: 65536,
      sourceFiles: 1
    });

    const reproducibility = text("apps/grader-runner/scripts/verify-reproducible.sh");
    expect(reproducibility).toContain("go build -mod=readonly -buildvcs=false -trimpath");
  });

  it("keeps profile runtime identity aligned with the pinned capability-minimal Go runtime", () => {
    const profile = canonicalProfiles()[0]!;
    const goMod = text("apps/grader-runner/go.mod");
    const goja = goMod.match(/github\.com\/dop251\/goja\s+(v\S+)/)?.[1];

    expect(goja).toBeDefined();
    expect(profile.language).toEqual({ key: "javascript", version: `goja@${goja}` });
    expect(goMod).not.toContain("goja_nodejs");

    const runnerTests = text("apps/grader-runner/internal/runner/runner_test.go");
    expect(runnerTests).toContain("TestLearnerRuntimeDoesNotExposeNodeOrHostCapabilities");
    for (const capability of ["process", "require", "fetch", "WebSocket"]) {
      expect(runnerTests).toContain(capability);
    }
  });

  it("ties runner argv and resource controls to the Kubernetes provider contract", () => {
    const profile = canonicalProfiles()[0]!;
    const dockerfile = text("apps/grader-runner/Dockerfile");
    const runnerConfig = text("apps/grader-runner/internal/runner/config.go");
    const provider = text("apps/grader-gateway/src/kubernetes-gvisor-sandbox-provider.ts");

    expect(dockerfile).toContain('ENTRYPOINT ["/grader-runner"]');
    expect(dockerfile).toContain("FROM scratch");
    expect(runnerConfig).toContain('modeJSSumV1           = "js-sum-v1"');
    expect(runnerConfig).toContain('getenv("GRADER_WALL_TIME_MS")');
    expect(runnerConfig).toContain('getenv("GRADER_CPU_TIME_MS")');
    expect(runnerConfig).toContain('getenv("GRADER_PIDS")');
    expect(runnerConfig).toContain('getenv("GRADER_OUTPUT_BYTES")');

    expect(provider).toContain("image: `${config.runnerImageRepository}@${profile.profile.runnerImageDigest}`");
    expect(provider).toContain("command: [profile.profile.argv[0]]");
    expect(provider).toContain("args: profile.profile.argv.slice(1)");
    expect(provider).toContain('name: "GRADER_WALL_TIME_MS"');
    expect(provider).toContain('name: "GRADER_CPU_TIME_MS"');
    expect(provider).toContain('name: "GRADER_PIDS"');
    expect(provider).toContain('name: "GRADER_OUTPUT_BYTES"');
    expect(provider).toContain("profile.profile.limits.wallTimeMs + config.startupGraceMs");
    expect(profile.limits.pids).toBe(64);
  });

  it("keeps the canonical profile inert until the production activation gate is explicit", () => {
    const profilesJson = readFileSync(PROFILE_PATH, "utf8");
    const config = loadGraderGatewayRuntimeConfig({
      GRADER_GATEWAY_SERVICE_TOKEN: "x".repeat(32),
      GRADER_EXECUTION_PROFILES_JSON: profilesJson
    });

    expect(config.profiles).toHaveLength(1);
    expect(config.sandboxProvider).toEqual({ kind: "unavailable" });
  });

  it("keeps real-cluster verification fail-closed and bound to actual target-cluster evidence", () => {
    const script = text("infra/grader/scripts/verify-real-cluster.sh");
    const runtimeClass = text("infra/grader/kubernetes/runtime-class.yaml");

    expect(runtimeClass).toContain("handler: runsc-nonet");
    expect(runtimeClass).toContain('grader.platform.internal/gvisor: "true"');
    expect(script).toContain("kubectl config current-context");
    expect(script).toContain("GRADER_SECRET_ENCRYPTION_EVIDENCE_FILE");
    expect(script).toContain("GRADER_GVISOR_RUNTIME_EVIDENCE_FILE");
    expect(script).toContain("podPidsLimit");
    expect(script).toContain("--dry-run=server");
    expect(script).toContain("default-deny NetworkPolicy is not deny-all for both ingress and egress");
    expect(script).toContain("live ResourceQuota does not match the finite grader sandbox capacity envelope");
    expect(script).toContain("live LimitRange does not match the grader sandbox hard envelope");
    expect(script).toContain("ValidatingAdmissionPolicy $policy is not fail-closed");
    expect(script).toContain("ValidatingAdmissionPolicyBinding $policy does not deny violations");
    expect(script).toContain("live admission rejected the hardened reference Pod");
    expect(script).toContain("admission accepted a Pod with weakened RuntimeClass");
    expect(script).toContain("admission accepted a Pod with ServiceAccount token automount");
    expect(script).toContain("admission accepted a Job with internal retry enabled");
    expect(script).toContain("duplicate Job create unexpectedly succeeded");
    expect(script).toContain('get jobs,pods,secrets -l "$VERIFY_LABEL"');
    expect(script).toContain("host-api");
    expect(script).toContain("cpu-limit");
    expect(script).toContain("output-limit");
  });
});
