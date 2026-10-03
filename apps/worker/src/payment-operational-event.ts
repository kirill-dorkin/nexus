import type { PaymentWebhookCycle } from "./payment-webhook.processor.js";

export type PaymentWorkerOperationalEvent = Readonly<{
  event: "public_launch.payment_worker";
  outcome: Exclude<PaymentWebhookCycle["kind"], "idle"> | "cycle_failure" | "startup_failure";
  durationMs: number;
  paymentStatus?: "paid" | "unpaid" | "no_payment_required";
  errorCode?:
    | "checkout_mapping_unavailable"
    | "settlement_mismatch"
    | "processor_failure";
  errorClass?: "runtime_error" | "unknown_error";
}>;

export function buildPaymentWorkerOperationalEvent(
  cycle: Exclude<PaymentWebhookCycle, Readonly<{ kind: "idle" }>>,
  durationMs: number
): PaymentWorkerOperationalEvent {
  const base = {
    event: "public_launch.payment_worker" as const,
    outcome: cycle.kind,
    durationMs: Math.max(0, Math.trunc(durationMs))
  };

  if (cycle.kind === "completed") {
    return { ...base, paymentStatus: cycle.paymentStatus };
  }
  if (
    cycle.kind === "blocked" ||
    cycle.kind === "rejected" ||
    cycle.kind === "retryable" ||
    cycle.kind === "dead_letter"
  ) {
    return { ...base, errorCode: cycle.errorCode };
  }
  return base;
}

export function buildPaymentWorkerFailureEvent(
  outcome: "cycle_failure" | "startup_failure",
  durationMs: number,
  error: unknown
): PaymentWorkerOperationalEvent {
  return {
    event: "public_launch.payment_worker",
    outcome,
    durationMs: Math.max(0, Math.trunc(durationMs)),
    errorClass: error instanceof Error ? "runtime_error" : "unknown_error"
  };
}
