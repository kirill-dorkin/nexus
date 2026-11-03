import { createDatabasePool } from "@platform/database";
import pino from "pino";

import { loadGraderWorkerConfig } from "./config.js";
import { GraderJobDispatcher } from "./grader-dispatcher.js";
import { GraderGatewayClient } from "./grader-gateway.client.js";
import { GraderJobRepository } from "./grader-job.repository.js";

const log = pino({ name: "worker" });

function sleep(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function main(): Promise<void> {
  const config = loadGraderWorkerConfig();
  const pool = createDatabasePool(config.databaseUrl, {
    applicationName: "platform-worker-grader",
    maxConnections: 4
  });
  const jobs = new GraderJobRepository(pool);
  const gateway = new GraderGatewayClient({
    baseUrl: config.gatewayUrl,
    serviceToken: config.gatewayServiceToken,
    timeoutMs: config.gatewayTimeoutMs
  });
  const dispatcher = new GraderJobDispatcher(jobs, gateway, {
    leaseSeconds: config.leaseSeconds,
    retryBaseMs: config.retryBaseMs,
    retryMaxMs: config.retryMaxMs
  });

  const shutdown = new AbortController();
  for (const signal of ["SIGINT", "SIGTERM"] as const) {
    process.once(signal, () => {
      shutdown.abort();
      log.info({ signal }, "worker shutdown requested");
    });
  }

  log.info(
    {
      gatewayUrl: config.gatewayUrl,
      leaseSeconds: config.leaseSeconds,
      gatewayTimeoutMs: config.gatewayTimeoutMs
    },
    "grader dispatcher started"
  );

  try {
    while (!shutdown.signal.aborted) {
      try {
        const cycle = await dispatcher.runOnce();
        if (cycle.kind === "idle") {
          await sleep(config.pollIntervalMs);
          continue;
        }
        if (cycle.kind === "terminal") {
          log.info(
            {
              jobId: cycle.jobId,
              attemptCount: cycle.attemptCount,
              graderStatus: cycle.graderStatus,
              validationResultId: cycle.validationResultId
            },
            "grader job reached terminal validation state"
          );
          continue;
        }
        if (cycle.kind === "retryable") {
          log.warn(
            {
              jobId: cycle.jobId,
              attemptCount: cycle.attemptCount,
              errorCode: cycle.errorCode,
              nextState: cycle.nextState
            },
            "grader dispatch failed without producing a learner outcome"
          );
          continue;
        }
        log.warn(
          { jobId: cycle.jobId, attemptCount: cycle.attemptCount },
          "grader lease was lost before canonical state could be changed"
        );
      } catch (error) {
        log.error(
          {
            errorName: error instanceof Error ? error.name : "UnknownError",
            errorMessage: error instanceof Error ? error.message : "unknown worker failure"
          },
          "grader dispatcher cycle failed"
        );
        await sleep(config.pollIntervalMs);
      }
    }
  } finally {
    await pool.end();
    log.info("worker stopped");
  }
}

void main().catch((error: unknown) => {
  log.fatal(
    {
      errorName: error instanceof Error ? error.name : "UnknownError",
      errorMessage: error instanceof Error ? error.message : "unknown worker startup failure"
    },
    "worker terminated unexpectedly"
  );
  process.exitCode = 1;
});
