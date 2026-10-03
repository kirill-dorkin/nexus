import { Logger } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";

import {
  buildPublicLaunchHttpEvent,
  buildPublicLaunchReconciliationEvent,
  buildPublicLaunchSecurityEvent,
  purchaseReconciliationAgeBucket,
  recordPublicLaunchSecurityEvent
} from "./public-launch-operational-events";

const forbiddenKey =
  /(^|_)(id|email|slug|url|origin|payload|body|signature|cookie|token)$/i;

function expectRedacted(value: unknown): void {
  if (Array.isArray(value)) {
    for (const entry of value) expectRedacted(entry);
    return;
  }
  if (typeof value !== "object" || value === null) return;
  for (const [key, nested] of Object.entries(value)) {
    expect(key).not.toMatch(forbiddenKey);
    expectRedacted(nested);
  }
}

describe("public launch operational events", () => {
  it("keeps HTTP events low-cardinality and identifier-free", () => {
    const event = buildPublicLaunchHttpEvent("checkout", "rejected", 409, 42.9);
    expect(event).toEqual({
      event: "public_launch.http",
      operation: "checkout",
      outcome: "rejected",
      statusCode: 409,
      durationMs: 42
    });
    expectRedacted(event);
  });

  it("keeps origin security events categorical instead of logging origins", () => {
    const event = buildPublicLaunchSecurityEvent(
      "rejected",
      "origin_mismatch"
    );
    expect(event).toEqual({
      event: "public_launch.security",
      operation: "browser_write_origin",
      outcome: "rejected",
      reason: "origin_mismatch"
    });
    expectRedacted(event);
  });

  it("buckets purchaser reconciliation age instead of logging identifiers or timestamps", () => {
    const createdAt = "2026-10-03T10:00:00.000Z";
    expect(
      purchaseReconciliationAgeBucket(
        createdAt,
        null,
        Date.parse("2026-10-03T10:04:00.000Z")
      )
    ).toBe("2m_5m");

    const event = buildPublicLaunchReconciliationEvent(
      "paid",
      createdAt,
      "2026-10-03T10:00:20.000Z"
    );
    expect(event).toEqual({
      event: "public_launch.reconciliation",
      purchaseStatus: "paid",
      ageBucket: "lt_30s"
    });
    expectRedacted(event);
  });

  it("never lets a process logger failure change the protected operation", () => {
    const log = vi.spyOn(Logger.prototype, "log").mockImplementation(() => {
      throw new Error("log transport unavailable");
    });
    try {
      expect(() =>
        recordPublicLaunchSecurityEvent("allowed", "origin_match")
      ).not.toThrow();
    } finally {
      log.mockRestore();
    }
  });
});
