import { act, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ClientTelemetry, telemetry } from "./client-telemetry";

vi.mock("next/web-vitals", () => ({ useReportWebVitals: vi.fn() }));

let fetchMock: ReturnType<typeof vi.fn>;
beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_API_ORIGIN", "https://api.example.test");
  fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => {
  telemetry.flush();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("ClientTelemetry", () => {
  it("reports an uncaught error of the page with its route template", () => {
    render(<ClientTelemetry />);
    act(() => {
      window.dispatchEvent(
        new ErrorEvent("error", {
          error: new TypeError("private detail"),
          filename: `${window.location.origin}/_next/static/chunks/app.js`
        })
      );
    });
    telemetry.flush();

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.example.test/v1/telemetry/web",
      expect.objectContaining({
        method: "POST",
        keepalive: true,
        credentials: "omit"
      })
    );
    const body = (fetchMock.mock.calls[0]?.[1] as RequestInit).body as string;
    expect(JSON.parse(body)).toMatchObject({
      events: [
        {
          type: "client_error",
          kind: "error",
          errorName: "TypeError",
          source: "app"
        }
      ]
    });
    expect(body).not.toContain("private detail");
  });

  it("sends what is queued when the page is hidden", () => {
    render(<ClientTelemetry />);
    act(() => {
      window.dispatchEvent(
        Object.assign(new Event("unhandledrejection"), {
          reason: new RangeError()
        })
      );
    });
    expect(fetchMock).not.toHaveBeenCalled();
    Object.defineProperty(document, "visibilityState", {
      value: "hidden",
      configurable: true
    });
    act(() => {
      document.dispatchEvent(new Event("visibilitychange"));
    });
    expect(fetchMock).toHaveBeenCalledOnce();
    Object.defineProperty(document, "visibilityState", {
      value: "visible",
      configurable: true
    });
  });
});
