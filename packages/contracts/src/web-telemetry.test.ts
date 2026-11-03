import { describe, expect, it } from "vitest";

import { webTelemetryBatchSchema } from "./web-telemetry";

const error = {
  type: "client_error",
  kind: "error",
  errorName: "TypeError",
  source: "app",
  route: "/courses/[course]/[lesson]"
};
const vital = {
  type: "web_vital",
  name: "LCP",
  rating: "good",
  value: 812.4,
  route: "/"
};

describe("web telemetry contract", () => {
  it("accepts a batch of errors and vitals", () => {
    expect(
      webTelemetryBatchSchema.safeParse({
        release: "a1b2c3d4e5f6",
        events: [error, vital]
      }).success
    ).toBe(true);
  });

  it.each([
    [
      "a URL instead of a route template",
      { ...error, route: "/courses/html/first-tag" }
    ],
    ["an error message", { ...error, message: "secret@example.com not found" }],
    ["an unknown error name", { ...error, errorName: "MyError" }],
    ["a negative vital", { ...vital, value: -1 }],
    ["an unknown vital", { ...vital, name: "FID" }]
  ])("rejects %s", (_, event) => {
    expect(
      webTelemetryBatchSchema.safeParse({ release: "local", events: [event] })
        .success
    ).toBe(false);
  });

  it("bounds the batch and the release label", () => {
    expect(
      webTelemetryBatchSchema.safeParse({ release: "local", events: [] })
        .success
    ).toBe(false);
    expect(
      webTelemetryBatchSchema.safeParse({
        release: "local",
        events: Array(21).fill(vital)
      }).success
    ).toBe(false);
    expect(
      webTelemetryBatchSchema.safeParse({
        release: "has space",
        events: [vital]
      }).success
    ).toBe(false);
  });
});
