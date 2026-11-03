import {
  BadRequestException,
  ForbiddenException,
  Logger,
  ServiceUnavailableException
} from "@nestjs/common";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { WebTelemetryController } from "./web-telemetry.controller";

const site = "https://academy.example.test";
const batch = {
  release: "a1b2c3d4e5f6",
  events: [
    {
      type: "client_error",
      kind: "error",
      errorName: "TypeError",
      source: "app",
      route: "/courses/[course]/[lesson]"
    },
    {
      type: "web_vital",
      name: "CLS",
      rating: "good",
      value: 0.0123456,
      route: "/"
    }
  ]
};

let warn: ReturnType<typeof vi.spyOn>;
let log: ReturnType<typeof vi.spyOn>;
beforeEach(() => {
  vi.stubEnv("WEB_APP_ORIGIN", site);
  warn = vi.spyOn(Logger.prototype, "warn").mockImplementation(() => undefined);
  log = vi.spyOn(Logger.prototype, "log").mockImplementation(() => undefined);
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("WebTelemetryController", () => {
  const controller = new WebTelemetryController();

  it("logs each event with only its allowlisted fields", () => {
    controller.receive(site, batch);
    expect(warn).toHaveBeenCalledWith(
      JSON.stringify({
        event: "web.client_error",
        release: "a1b2c3d4e5f6",
        kind: "error",
        errorName: "TypeError",
        source: "app",
        route: "/courses/[course]/[lesson]"
      })
    );
    expect(log).toHaveBeenCalledWith(
      JSON.stringify({
        event: "web.vital",
        release: "a1b2c3d4e5f6",
        name: "CLS",
        rating: "good",
        value: 0.012,
        route: "/"
      })
    );
  });

  it("accepts reports only from the site's own origin", () => {
    expect(() => controller.receive("https://evil.example", batch)).toThrow(
      ForbiddenException
    );
    expect(() => controller.receive(undefined, batch)).toThrow(
      ForbiddenException
    );
    expect(warn).not.toHaveBeenCalled();
  });

  it("refuses to run without a configured site origin", () => {
    vi.stubEnv("WEB_APP_ORIGIN", "");
    expect(() => controller.receive(site, batch)).toThrow(
      ServiceUnavailableException
    );
  });

  it("rejects a batch outside the contract, such as one carrying a message", () => {
    const leaking = {
      ...batch,
      events: [{ ...batch.events[0], message: "user@example.com" }]
    };
    expect(() => controller.receive(site, leaking)).toThrow(
      BadRequestException
    );
    expect(warn).not.toHaveBeenCalled();
  });
});
