import { createDatabasePool } from "@platform/database";
import pino from "pino";

import { PaymentWebhookProcessor } from "./payment-webhook.processor.js";

const log = pino({ name: "payment-worker" });

function required(name: string): string {
  const value = process.env[name];
  if (value === undefined || value.trim().length === 0) {
    throw new Error(`${name} is required.`);
  }
  return value;
}

function integer(
  name: string,
  fallback: number,
  minimum: number,
  maximum: number
): number {
  const raw = process.env[name];
  const value =
    raw === undefined || raw.trim().length === 0 ? fallback : Number(raw);
  if (!Number.isInteger(value) || value < minimum || value > maximum) {
    throw new Error(
      `${name} must be an integer between ${minimum} and ${maximum}.`
    );
  }
  return value;
}

function sleep(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function main(): Promise<void> {
  const pollIntervalMs = integer(
    "PAYMENT_WORKER_POLL_INTERVAL_MS",
    1_000,
    50,
    60_000
  );
  const leaseSeconds = integer(
    "PAYMENT_WORKER_LEASE_SECONDS",
    60,
    1,
    900
  );
  const retryBaseMs = integer(
    "PAYMENT_WORKER_RETRY_BASE_MS",
    1_000,
    100,
    60_000
  );
  const retryMaxMs = integer(
    "PAYMENT_WORKER_RETRY_MAX_MS",
    60_000,
    100,
    300_000
  );
  if (retryMaxMs < retryBaseMs) {
    throw new Error(
      "PAYMENT_WORKER_RETRY_MAX_MS must be greater than or equal to PAYMENT_WORKER_RETRY_BASE_MS."
    );
  }

  const pool = createDatabasePool(required("DATABASE_WORKER_URL"), {
    applicationName: "platform-worker-payments",
    maxConnections: 4
  });
  const processor = new PaymentWebhookProcessor(pool, {
    leaseSeconds,
    retryBaseMs,
    retryMaxMs
  });

  let stopping = false;
  for (const signal of ["SIGINT", "SIGTERM"] as const) {
    process.once(signal, () => {
      stopping = true;
      log.info({ signal }, "payment worker shutdown requested");
    });
  }

  log.info(
    { leaseSeconds, pollIntervalMs },
    "payment webhook processor started"
  );

  try {
    while (!stopping) {
      try {
        const cycle = await processor.processOne();

        if (cycle.kind === "idle") {
          await sleep(pollIntervalMs);
          continue;
        }

        if (cycle.kind === "completed") {
          log.info(
            {
              inboxId: cycle.inboxId,
              purchaseId: cycle.purchaseId,
              paymentStatus: cycle.paymentStatus
            },
            "payment webhook processing completed"
          );
          continue;
        }

        if (cycle.kind === "blocked") {
          log.warn(
            {
              inboxId: cycle.inboxId,
              errorCode: cycle.errorCode
            },
            "payment webhook blocked pending trusted checkout mapping"
          );
          continue;
        }

        if (cycle.kind === "rejected") {
          log.warn(
            {
              inboxId: cycle.inboxId,
              errorCode: cycle.errorCode
            },
            "payment webhook rejected without changing canonical Purchase state"
          );
          continue;
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
          continue;
        }

        log.warn(
          { inboxId: cycle.inboxId },
          "payment webhook lease was lost before canonical state could be changed"
        );
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
        await sleep(pollIntervalMs);
      }
    }
  } finally {
    await pool.end();
    log.info("payment webhook processor stopped");
  }
}

void main().catch((error: unknown) => {
  log.fatal(
    {
      errorName: error instanceof Error ? error.name : "UnknownError",
      errorMessage:
        error instanceof Error ? error.message : "unknown payment worker startup failure"
    },
    "payment worker terminated unexpectedly"
  );
  process.exitCode = 1;
});
