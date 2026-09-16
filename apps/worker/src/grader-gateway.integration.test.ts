import { createServer, type Server } from "node:http";

import {
  buildGraderJobId,
  type GraderJobRequest,
  type GraderJobSpec
} from "@platform/contracts/grader";
import { afterEach, describe, expect, it } from "vitest";

import { createGraderGateway } from "../../grader-gateway/src/app.js";
import {
  GraderExecutionProfileRegistry,
  type GraderExecutionProfile
} from "../../grader-gateway/src/execution-profile.js";
import { SandboxProvider } from "../../grader-gateway/src/sandbox-provider.js";
import {
  GraderGatewayClient,
  GraderGatewayDispatchError
} from "./grader-gateway.client.js";

const serviceToken = "worker-service-token-that-is-at-least-32-bytes-long";
const profile: GraderExecutionProfile = {
  key: "typescript-tests",
  version: 1,
  language: { key: "typescript", version: "5.9" },
  runnerImageDigest: `sha256:${"d".repeat(64)}`,
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

function requestFor(content: string): GraderJobRequest {
  const spec: GraderJobSpec = {
    protocolVersion: 1,
    profile: { key: profile.key, version: profile.version },
    submissionId: "018f3fd0-7b5f-7a1a-9bf8-b80979358022",
    activityVersionId: "018f3fd0-7b5f-7a1a-9bf8-b80979358023",
    source: { files: [{ path: "index.ts", content }] }
  };
  return { ...spec, jobId: buildGraderJobId(spec) };
}

class CapturingProvider extends SandboxProvider {
  requests: GraderJobRequest[] = [];

  async execute(request: GraderJobRequest): Promise<unknown> {
    this.requests.push(request);
    return {
      protocolVersion: 1,
      jobId: request.jobId,
      status: "completed",
      outcome: "passed",
      score: 1,
      payload: { tests: 4 }
    };
  }
}

describe("Worker -> Grader Gateway dispatch", () => {
  const cleanup: Array<() => Promise<void>> = [];

  afterEach(async () => {
    while (cleanup.length > 0) {
      await cleanup.pop()?.();
    }
  });

  it("authenticates as the trusted worker and transports the exact persisted request", async () => {
    const provider = new CapturingProvider();
    const gateway = createGraderGateway({
      serviceToken,
      profileRegistry: new GraderExecutionProfileRegistry([profile]),
      sandboxProvider: provider
    });
    await gateway.listen({ host: "127.0.0.1", port: 0 });
    cleanup.push(() => gateway.close());

    const address = gateway.server.address();
    if (address === null || typeof address === "string") throw new Error("Gateway did not bind TCP.");
    const baseUrl = `http://127.0.0.1:${address.port}`;
    const request = requestFor("export const answer = 42;");

    const client = new GraderGatewayClient({
      baseUrl,
      serviceToken,
      timeoutMs: 5_000
    });
    await expect(client.dispatch(request)).resolves.toEqual({
      protocolVersion: 1,
      jobId: request.jobId,
      status: "completed",
      outcome: "passed",
      score: 1,
      payload: { tests: 4 }
    });
    expect(provider.requests).toEqual([request]);

    const untrusted = new GraderGatewayClient({
      baseUrl,
      serviceToken: "wrong-service-token-that-is-still-long-enough",
      timeoutMs: 5_000
    });
    await expect(untrusted.dispatch(request)).rejects.toMatchObject({
      name: "GraderGatewayDispatchError",
      code: "gateway_http_401",
      retryable: true
    });
    expect(provider.requests).toHaveLength(1);
  });

  it("rejects a successful HTTP response for a different job before canonical state can use it", async () => {
    const request = requestFor("export const answer = 7;");
    let server: Server;
    server = createServer((incoming, response) => {
      expect(incoming.headers.authorization).toBe(`Bearer ${serviceToken}`);
      response.writeHead(200, { "content-type": "application/json" });
      response.end(
        JSON.stringify({
          protocolVersion: 1,
          jobId: `sha256:${"f".repeat(64)}`,
          status: "completed",
          outcome: "passed",
          score: 1,
          payload: {}
        })
      );
    });
    await new Promise<void>((resolve, reject) => {
      server.once("error", reject);
      server.listen(0, "127.0.0.1", () => resolve());
    });
    cleanup.push(
      () =>
        new Promise<void>((resolve, reject) =>
          server.close((error) => (error === undefined ? resolve() : reject(error)))
        )
    );

    const address = server.address();
    if (address === null || typeof address === "string") throw new Error("Test server did not bind TCP.");
    const client = new GraderGatewayClient({
      baseUrl: `http://127.0.0.1:${address.port}`,
      serviceToken,
      timeoutMs: 5_000
    });

    await expect(client.dispatch(request)).rejects.toEqual(
      expect.objectContaining<Partial<GraderGatewayDispatchError>>({
        name: "GraderGatewayDispatchError",
        code: "gateway_protocol_error",
        retryable: true
      })
    );
  });
});
