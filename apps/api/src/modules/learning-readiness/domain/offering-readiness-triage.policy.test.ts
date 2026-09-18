import { describe, expect, it } from "vitest";

import {
  OFFERING_READINESS_TRIAGE_POLICY,
  orderOfferingReadinessV1
} from "./offering-readiness-triage.policy";

describe("orderOfferingReadinessV1", () => {
  it("orders definitive blockers before uncertainty before ready learners", () => {
    const ordered = orderOfferingReadinessV1([
      {
        enrollmentId: "00000000-0000-4000-8000-000000000003",
        enrolledAt: "2026-09-01T00:00:00.000Z",
        status: "ready" as const
      },
      {
        enrollmentId: "00000000-0000-4000-8000-000000000002",
        enrolledAt: "2026-09-02T00:00:00.000Z",
        status: "insufficient_evidence" as const
      },
      {
        enrollmentId: "00000000-0000-4000-8000-000000000001",
        enrolledAt: "2026-09-03T00:00:00.000Z",
        status: "not_ready" as const
      }
    ]);

    expect(ordered.map((entry) => entry.status)).toEqual([
      "not_ready",
      "insufficient_evidence",
      "ready"
    ]);
  });

  it("uses enrolledAt then stable Enrollment id only as deterministic tie-breakers", () => {
    const ordered = orderOfferingReadinessV1([
      {
        enrollmentId: "00000000-0000-4000-8000-000000000003",
        enrolledAt: "2026-09-02T00:00:00.000Z",
        status: "not_ready" as const
      },
      {
        enrollmentId: "00000000-0000-4000-8000-000000000002",
        enrolledAt: "2026-09-01T00:00:00.000Z",
        status: "not_ready" as const
      },
      {
        enrollmentId: "00000000-0000-4000-8000-000000000001",
        enrolledAt: "2026-09-01T00:00:00.000Z",
        status: "not_ready" as const
      }
    ]);

    expect(ordered.map((entry) => entry.enrollmentId)).toEqual([
      "00000000-0000-4000-8000-000000000001",
      "00000000-0000-4000-8000-000000000002",
      "00000000-0000-4000-8000-000000000003"
    ]);
  });

  it("fails closed on invalid Delivery timestamps", () => {
    expect(() =>
      orderOfferingReadinessV1([
        {
          enrollmentId: "00000000-0000-4000-8000-000000000001",
          enrolledAt: "not-a-date",
          status: "ready"
        }
      ])
    ).toThrow("valid enrolledAt instant");
  });

  it("pins the v1 status-only triage order", () => {
    expect(OFFERING_READINESS_TRIAGE_POLICY).toEqual({
      key: "offering-readiness-triage",
      version: 1,
      statusOrder: ["not_ready", "insufficient_evidence", "ready"]
    });
  });
});
