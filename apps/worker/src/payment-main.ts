import { createDatabasePool } from "@platform/database";
import pino from "pino";

import {
  buildPaymentWorkerFailureEvent,
  buildPaymentWorkerOperationalEvent,
  safelyWritePaymentWorkerOperationalEvent
} from "./payment-operational-event.js";
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
      safelyWritePaymentWorkerOperationalEvent(() =>
        log.info({ signal }, "payment worker shutdown requested")
      );
    });
  }

  safelyWritePaymentWorkerOperationalEvent(() =>
    log.info(
      { leaseSeconds, pollIntervalMs },
      "payment webhook processor started"
    )
  );

  try {
    while (!stopping) {
      const startedAt = Date.now();
      try {
        const cycle = await processor.processOne();

        if (cycle.kind === "idle") {
          await sleep(pollIntervalMs);
          continue;
        }

        const event = buildPaymentWorkerOperationalEvent(
          cycle,
          Date.now() - startedAt
        );
        if (
          cycle.kind === "blocked" ||
          cycle.kind === "rejected" ||
          cycle.kind === "lease_lost"
        ) {
          safelyWritePaymentWorkerOperationalEvent(() =>
            log.warn(event, "payment webhook processing outcome")
          );
          continue;
        }
        if (cycle.kind === "retryable" || cycle.kind === "dead_letter") {
          safelyWritePaymentWorkerOperationalEvent(() =>
            log.error(event, "payment webhook processing outcome")
          );
          continue;
        }
        safelyWritePaymentWorkerOperationalEvent(() =>
          log.info(event, "payment webhook processing outcome")
        );
      } catch (error) {
        safelyWritePaymentWorkerOperationalEvent(() =>
          log.error(
            buildPaymentWorkerFailureEvent(
              "cycle_failure",
              Date.now() - startedAt,
              error
            ),
            "payment webhook processor cycle failed"
          )
        );
        await sleep(pollIntervalMs);
      }
    }
  } finally {
    await pool.end();
    safelyWritePaymentWorkerOperationalEvent(() =>
      log.info("payment webhook processor stopped")
    );
  }
}

const processStartedAt = Date.now();
void main().catch((error: unknown) => {
  safelyWritePaymentWorkerOperationalEvent(() =>
    log.fatal(
      buildPaymentWorkerFailureEvent(
        "startup_failure",
        Date.now() - processStartedAt,
        error
      ),
      "payment worker terminated unexpectedly"
    )
  );
  process.exitCode = 1;
});
