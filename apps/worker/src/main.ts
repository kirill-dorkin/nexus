import { createDatabasePool } from "@platform/database";
import pino from "pino";

import { loadGraderWorkerConfig } from "./config.js";
import { GraderJobDispatcher } from "./grader-dispatcher.js";
import { GraderGatewayClient } from "./grader-gateway.client.js";
import { GraderJobRepository } from "./grader-job.repository.js";
import {
  PaymentWebhookProcessor,
  type PaymentWebhookCycle
} from "./payment-webhook.processor.js";

const log = pino({ name: "worker" });

function sleep(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function logPaymentCycle(cycle: PaymentWebhookCycle): void {
  if (cycle.kind === "idle") return;

  if (cycle.kind === "completed") {
    log.info(
      {
        inboxId: cycle.inboxId,
        purchaseId: cycle.purchaseId,
        paymentStatus: cycle.paymentStatus
      },
      "payment webhook processing completed"
    );
    return;
  }

  if (cycle.kind === "blocked") {
    log.warn(
      {
        inboxId: cycle.inboxId,
        errorCode: cycle.errorCode
      },
      "payment webhook blocked pending trusted checkout mapping"
    );
    return;
  }

  if (cycle.kind === "rejected") {
    log.warn(
      {
        inboxId: cycle.inboxId,
        errorCode: cycle.errorCode
      },
      "payment webhook rejected without changing canonical Purchase state"
    );
    return;
  }

  if (cycle.kind === "retryable" || cycle.kind === "dead_letter") {
    log.error(
      {
        inboxId: cycle.inboxId,
        errorCode: cycle.errorCode,
        nextState: cycle.kind
      },
      "payment webhook processor failed"
    );
    return;
  }

  log.warn(
    { inboxId: cycle.inboxId },
    "payment webhook lease was lost before canonical state could be changed"
  );
}

async function main(): Promise<void> {
  const config = loadGraderWorkerConfig();
  const pool = createDatabasePool(config.databaseUrl, {
    applicationName: "platform-worker",
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
  const payments = new PaymentWebhookProcessor(pool, {
    leaseSeconds: config.leaseSeconds,
    retryBaseMs: config.retryBaseMs,
    retryMaxMs: config.retryMaxMs
  });

  let stopping = false;
  for (const signal of ["SIGINT", "SIGTERM"] as const) {
    process.once(signal, () => {
      stopping = true;
      log.info({ signal }, "worker shutdown requested");
    });
  }

  log.info(
    {
      gatewayUrl: config.gatewayUrl,
      leaseSeconds: config.leaseSeconds,
      gatewayTimeoutMs: config.gatewayTimeoutMs
    },
    "worker processors started"
  );

  try {
    while (!stopping) {
      let didWork = false;

      try {
        const paymentCycle = await payments.processOne();
        if (paymentCycle.kind !== "idle") {
          didWork = true;
          logPaymentCycle(paymentCycle);
        }
      } catch (error) {
        log.error(
          {
            errorName: error instanceof Error ? error.name : "UnknownError",
            errorMessage:
              error instanceof Error
                ? error.message
                : "unknown payment worker failure"
          },
          "payment webhook processor cycle failed"
        );
      }

      try {
        const cycle = await dispatcher.runOnce();
        if (cycle.kind !== "idle") {
          didWork = true;
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
        } else if (cycle.kind === "retryable") {
          log.warn(
            {
              jobId: cycle.jobId,
              attemptCount: cycle.attemptCount,
              errorCode: cycle.errorCode,
              nextState: cycle.nextState
            },
            "grader dispatch failed without producing a learner outcome"
          );
        } else if (cycle.kind === "lease_lost") {
          log.warn(
            { jobId: cycle.jobId, attemptCount: cycle.attemptCount },
            "grader lease was lost before canonical state could be changed"
          );
        }
      } catch (error) {
        log.error(
          {
            errorName: error instanceof Error ? error.name : "UnknownError",
            errorMessage:
              error instanceof Error
                ? error.message
                : "unknown grader worker failure"
          },
          "grader dispatcher cycle failed"
        );
      }

      if (!didWork) {
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
      errorMessage:
        error instanceof Error ? error.message : "unknown worker startup failure"
    },
    "worker terminated unexpectedly"
  );
  process.exitCode = 1;
});
