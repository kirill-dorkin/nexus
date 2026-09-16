import { createServer, type IncomingMessage, type Server } from "node:http";

import {
  buildGraderJobId,
  type GraderJobRequest,
  type GraderJobSpec
} from "@platform/contracts/grader";
import { afterEach, describe, expect, it } from "vitest";

import {
  GraderGatewayClient,
  GraderGatewayDispatchError
} from "./grader-gateway.client.js";

const serviceToken = "worker-service-token-that-is-at-least-32-bytes-long";

function requestFor(content: string): GraderJobRequest {
  const spec: GraderJobSpec = {
    protocolVersion: 1,
    profile: { key: "typescript-tests", version: 1 },
    submissionId: "018f3fd0-7b5f-7a1a-9bf8-b80979358022",
    activityVersionId: "018f3fd0-7b5f-7a1a-9bf8-b80979358023",
    source: { files: [{ path: "index.ts", content }] }
  };
  return { ...spec, jobId: buildGraderJobId(spec) };
}

async function readJsonBody(request: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8")) as unknown;
}

async function listen(server: Server): Promise<string> {
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => resolve());
  });
  const address = server.address();
  if (address === null || typeof address === "string") {
    throw new Error("Test server did not bind TCP.");
  }
  return `http://127.0.0.1:${address.port}`;
}

function close(server: Server): Promise<void> {
  return new Promise<void>((resolve, reject) =>
    server.close((error) => (error === undefined ? resolve() : reject(error)))
  );
}

describe("Worker -> Grader Gateway transport", () => {
  const cleanup: Array<() => Promise<void>> = [];

  afterEach(async () => {
    while (cleanup.length > 0) {
      await cleanup.pop()?.();
    }
  });

  it("sends trusted service identity and transports the exact persisted request", async () => {
    const persisted = requestFor("export const answer = 42;");
    const received: unknown[] = [];
    const server = createServer(async (incoming, response) => {
      try {
        if (incoming.url !== "/v1/jobs" || incoming.method !== "POST") {
          response.writeHead(404).end();
          return;
        }
        if (incoming.headers.authorization !== `Bearer ${serviceToken}`) {
          response.writeHead(401, { "content-type": "application/json" });
          response.end(JSON.stringify({ error: { code: "service_authentication_required" } }));
          return;
        }
        const body = await readJsonBody(incoming);
        received.push(body);
        response.writeHead(200, { "content-type": "application/json" });
        response.end(
          JSON.stringify({
            protocolVersion: 1,
            jobId: persisted.jobId,
            status: "completed",
            outcome: "passed",
            score: 1,
            payload: { tests: 4 }
          })
        );
      } catch {
        response.writeHead(500).end();
      }
    });
    const baseUrl = await listen(server);
    cleanup.push(() => close(server));

    const client = new GraderGatewayClient({
      baseUrl,
      serviceToken,
      timeoutMs: 5_000
    });
    await expect(client.dispatch(persisted)).resolves.toEqual({
      protocolVersion: 1,
      jobId: persisted.jobId,
      status: "completed",
      outcome: "passed",
      score: 1,
      payload: { tests: 4 }
    });
    expect(received).toEqual([persisted]);

    const untrusted = new GraderGatewayClient({
      baseUrl,
      serviceToken: "wrong-service-token-that-is-still-long-enough",
      timeoutMs: 5_000
    });
    await expect(untrusted.dispatch(persisted)).rejects.toMatchObject({
      name: "GraderGatewayDispatchError",
      code: "gateway_http_401",
      retryable: true
    });
    expect(received).toHaveLength(1);
  });

  it("rejects a successful HTTP response for a different job before canonical state can use it", async () => {
    const persisted = requestFor("export const answer = 7;");
    const server = createServer(async (incoming, response) => {
      try {
        expect(incoming.headers.authorization).toBe(`Bearer ${serviceToken}`);
        expect(await readJsonBody(incoming)).toEqual(persisted);
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
      } catch {
        response.writeHead(500).end();
      }
    });
    const baseUrl = await listen(server);
    cleanup.push(() => close(server));

    const client = new GraderGatewayClient({
      baseUrl,
      serviceToken,
      timeoutMs: 5_000
    });

    await expect(client.dispatch(persisted)).rejects.toEqual(
      expect.objectContaining<Partial<GraderGatewayDispatchError>>({
        name: "GraderGatewayDispatchError",
        code: "gateway_protocol_error",
        retryable: true
      })
    );
  });
});
