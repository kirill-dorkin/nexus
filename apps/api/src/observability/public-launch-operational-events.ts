import { HttpException, Logger } from "@nestjs/common";

export type PublicLaunchHttpOperation =
  | "catalog_list"
  | "catalog_detail"
  | "customer_entry"
  | "checkout"
  | "paddle_webhook"
  | "purchaser_reconciliation";

export type PublicLaunchHttpOutcome = "success" | "rejected" | "failed";

export type PublicLaunchHttpEvent = Readonly<{
  event: "public_launch.http";
  operation: PublicLaunchHttpOperation;
  outcome: PublicLaunchHttpOutcome;
  statusCode: number;
  durationMs: number;
}>;

export type PublicLaunchSecurityEvent = Readonly<{
  event: "public_launch.security";
  operation: "browser_write_origin";
  outcome: "allowed" | "rejected" | "misconfigured";
  reason:
    | "origin_match"
    | "origin_missing_or_invalid"
    | "origin_mismatch"
    | "web_origin_unavailable";
}>;

export type PurchaseReconciliationAgeBucket =
  | "lt_30s"
  | "30s_2m"
  | "2m_5m"
  | "5m_15m"
  | "gte_15m";

export type PublicLaunchReconciliationEvent = Readonly<{
  event: "public_launch.reconciliation";
  purchaseStatus: "pending" | "paid";
  ageBucket: PurchaseReconciliationAgeBucket;
}>;

const logger = new Logger("PublicLaunchOperations");

function elapsedMs(startedAt: number): number {
  return Math.max(0, Date.now() - startedAt);
}

function statusCodeFor(error: unknown): number {
  return error instanceof HttpException ? error.getStatus() : 500;
}

function outcomeFor(statusCode: number): PublicLaunchHttpOutcome {
  if (statusCode < 400) return "success";
  return statusCode < 500 ? "rejected" : "failed";
}

function emit(
  event:
    | PublicLaunchHttpEvent
    | PublicLaunchSecurityEvent
    | PublicLaunchReconciliationEvent
): void {
  const serialized = JSON.stringify(event);
  if ("outcome" in event && event.outcome === "failed") {
    logger.error(serialized);
    return;
  }
  if (
    "outcome" in event &&
    (event.outcome === "rejected" || event.outcome === "misconfigured")
  ) {
    logger.warn(serialized);
    return;
  }
  logger.log(serialized);
}

export function buildPublicLaunchHttpEvent(
  operation: PublicLaunchHttpOperation,
  outcome: PublicLaunchHttpOutcome,
  statusCode: number,
  durationMs: number
): PublicLaunchHttpEvent {
  return {
    event: "public_launch.http",
    operation,
    outcome,
    statusCode,
    durationMs: Math.max(0, Math.trunc(durationMs))
  };
}

export function buildPublicLaunchSecurityEvent(
  outcome: PublicLaunchSecurityEvent["outcome"],
  reason: PublicLaunchSecurityEvent["reason"]
): PublicLaunchSecurityEvent {
  return {
    event: "public_launch.security",
    operation: "browser_write_origin",
    outcome,
    reason
  };
}

export function purchaseReconciliationAgeBucket(
  createdAt: string,
  paidAt: string | null,
  now = Date.now()
): PurchaseReconciliationAgeBucket {
  const created = Date.parse(createdAt);
  const terminal = paidAt === null ? now : Date.parse(paidAt);
  const ageMs = Math.max(0, terminal - created);
  if (ageMs < 30_000) return "lt_30s";
  if (ageMs < 120_000) return "30s_2m";
  if (ageMs < 300_000) return "2m_5m";
  if (ageMs < 900_000) return "5m_15m";
  return "gte_15m";
}

export function buildPublicLaunchReconciliationEvent(
  purchaseStatus: PublicLaunchReconciliationEvent["purchaseStatus"],
  createdAt: string,
  paidAt: string | null,
  now = Date.now()
): PublicLaunchReconciliationEvent {
  return {
    event: "public_launch.reconciliation",
    purchaseStatus,
    ageBucket: purchaseReconciliationAgeBucket(createdAt, paidAt, now)
  };
}

export function recordPublicLaunchSecurityEvent(
  outcome: PublicLaunchSecurityEvent["outcome"],
  reason: PublicLaunchSecurityEvent["reason"]
): void {
  emit(buildPublicLaunchSecurityEvent(outcome, reason));
}

export function recordPublicLaunchReconciliation(
  purchaseStatus: PublicLaunchReconciliationEvent["purchaseStatus"],
  createdAt: string,
  paidAt: string | null
): void {
  emit(
    buildPublicLaunchReconciliationEvent(
      purchaseStatus,
      createdAt,
      paidAt
    )
  );
}

export async function observePublicLaunchHttp<T>(
  operation: PublicLaunchHttpOperation,
  successStatusCode: number,
  action: () => Promise<T> | T
): Promise<T> {
  const startedAt = Date.now();
  try {
    const result = await action();
    emit(
      buildPublicLaunchHttpEvent(
        operation,
        "success",
        successStatusCode,
        elapsedMs(startedAt)
      )
    );
    return result;
  } catch (error) {
    const statusCode = statusCodeFor(error);
    emit(
      buildPublicLaunchHttpEvent(
        operation,
        outcomeFor(statusCode),
        statusCode,
        elapsedMs(startedAt)
      )
    );
    throw error;
  }
}
