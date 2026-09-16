import { afterEach, describe, expect, it } from "vitest";

import { createGraderGateway } from "./app.js";
import {
  GraderExecutionProfileRegistry,
  type GraderExecutionProfile
} from "./execution-profile.js";
import { buildGraderJobId, type GraderJobRequest, type GraderJobSpec } from "./protocol.js";
import { SandboxProvider } from "./sandbox-provider.js";

const token = "grader-service-token-for-tests-0123456789";
const apps: ReturnType<typeof createGraderGateway>[] = [];

function profile(): GraderExecutionProfile {
  return {
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
}

function job(
  options: Readonly<{
    profile?: GraderJobSpec["profile"];
    content?: string;
  }> = {}
): GraderJobRequest {
  const spec: GraderJobSpec = {
    protocolVersion: 1,
    profile: options.profile ?? { key: "typescript-tests", version: 1 },
    submissionId: "01994fc0-8e4a-7f5c-8d26-dbe90af34021",
    activityVersionId: "01994fc0-8e4a-7f5c-8d26-dbe90af34022",
    source: {
      files: [{ path: "index.ts", content: options.content ?? "export const value = 1;" }]
    }
  };
  return { ...spec, jobId: buildGraderJobId(spec) };
}

function app(options: Parameters<typeof createGraderGateway>[0]) {
  const instance = createGraderGateway(options);
  apps.push(instance);
  return instance;
}

afterEach(async () => {
  await Promise.all(apps.splice(0).map((instance) => instance.close()));
});

describe("Grader Gateway admission", () => {
  it("keeps health public but requires exact service authentication for jobs", async () => {
    const gateway = app({ serviceToken: token });

    expect((await gateway.inject({ method: "GET", url: "/health" })).statusCode).toBe(200);

    const missing = await gateway.inject({ method: "POST", url: "/v1/jobs", payload: job() });
    expect(missing.statusCode).toBe(401);

    const wrong = await gateway.inject({
      method: "POST",
      url: "/v1/jobs",
      headers: { authorization: "Bearer wrong-token" },
      payload: job()
    });
    expect(wrong.statusCode).toBe(401);
  });

  it("rejects unknown profiles and a reused identity for changed source", async () => {
    const gateway = app({
      serviceToken: token,
      profileRegistry: new GraderExecutionProfileRegistry([profile()])
    });
    const headers = { authorization: `Bearer ${token}` };

    const unknown = await gateway.inject({
      method: "POST",
      url: "/v1/jobs",
      headers,
      payload: job({ profile: { key: "python-tests", version: 1 } })
    });
    expect(unknown.statusCode).toBe(422);
    expect(JSON.parse(unknown.body).error.code).toBe("execution_profile_not_found");

    const original = job();
    const changed = job({ content: "export const value = 2;" });
    const identityMismatch = await gateway.inject({
      method: "POST",
      url: "/v1/jobs",
      headers,
      payload: { ...changed, jobId: original.jobId }
    });
    expect(identityMismatch.statusCode).toBe(422);
    expect(JSON.parse(identityMismatch.body).error.code).toBe("job_identity_mismatch");
  });

  it("returns deterministic system_error while no sandbox provider is configured", async () => {
    const gateway = app({
      serviceToken: token,
      profileRegistry: new GraderExecutionProfileRegistry([profile()])
    });
    const headers = { authorization: `Bearer ${token}` };
    const payload = job();

    const first = await gateway.inject({ method: "POST", url: "/v1/jobs", headers, payload });
    const replay = await gateway.inject({ method: "POST", url: "/v1/jobs", headers, payload });

    expect(first.statusCode).toBe(200);
    expect(JSON.parse(first.body)).toEqual({
      protocolVersion: 1,
      jobId: payload.jobId,
      status: "system_error",
      error: { code: "sandbox_provider_unavailable", retryable: true }
    });
    expect(JSON.parse(replay.body)).toEqual(JSON.parse(first.body));
  });

  it("normalizes a sandbox provider exception to system_error rather than learner failure", async () => {
    class ThrowingProvider extends SandboxProvider {
      async execute(): Promise<never> {
        throw new Error("simulated sandbox infrastructure failure");
      }
    }

    const gateway = app({
      serviceToken: token,
      profileRegistry: new GraderExecutionProfileRegistry([profile()]),
      sandboxProvider: new ThrowingProvider()
    });
    const payload = job();
    const response = await gateway.inject({
      method: "POST",
      url: "/v1/jobs",
      headers: { authorization: `Bearer ${token}` },
      payload
    });

    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body)).toEqual({
      protocolVersion: 1,
      jobId: payload.jobId,
      status: "system_error",
      error: { code: "sandbox_provider_failure", retryable: true }
    });
  });

  it("normalizes malformed or oversized provider output to system_error", async () => {
    class MalformedProvider extends SandboxProvider {
      async execute(): Promise<unknown> {
        return { status: "completed", outcome: "passed" };
      }
    }

    const malformedGateway = app({
      serviceToken: token,
      profileRegistry: new GraderExecutionProfileRegistry([profile()]),
      sandboxProvider: new MalformedProvider()
    });
    const payload = job();
    const malformed = await malformedGateway.inject({
      method: "POST",
      url: "/v1/jobs",
      headers: { authorization: `Bearer ${token}` },
      payload
    });
    expect(JSON.parse(malformed.body).error.code).toBe("sandbox_provider_invalid_result");

    class OversizedProvider extends SandboxProvider {
      async execute(request: GraderJobRequest): Promise<unknown> {
        return {
          protocolVersion: 1,
          jobId: request.jobId,
          status: "completed",
          outcome: "passed",
          score: 1,
          payload: { detail: "0123456789abcdef" }
        };
      }
    }

    const restrictive = profile();
    const oversizedGateway = app({
      serviceToken: token,
      profileRegistry: new GraderExecutionProfileRegistry([
        { ...restrictive, limits: { ...restrictive.limits, outputBytes: 8 } }
      ]),
      sandboxProvider: new OversizedProvider()
    });
    const oversized = await oversizedGateway.inject({
      method: "POST",
      url: "/v1/jobs",
      headers: { authorization: `Bearer ${token}` },
      payload
    });
    expect(JSON.parse(oversized.body).error.code).toBe(
      "sandbox_provider_output_limit_exceeded"
    );
  });
});
