"use client";
import { useEffect } from "react";
import { useReportWebVitals } from "next/web-vitals";

import { clientError } from "../../lib/telemetry/errors";
import { createReporter, sendToApi } from "../../lib/telemetry/reporter";
import { routeTemplate } from "../../lib/telemetry/route";

const RELEASE = process.env.NEXT_PUBLIC_RELEASE ?? "local";
const VITALS = new Set(["CLS", "FCP", "INP", "LCP", "TTFB"]);
const RATINGS = new Set(["good", "needs-improvement", "poor"]);

/** One reporter per page load, shared by the listeners and the error boundary. */
export const telemetry = createReporter(RELEASE, sendToApi);

const route = () => routeTemplate(window.location.pathname);

/**
 * Reports uncaught errors, unhandled promise rejections and Web Vitals of
 * every page (ADR-0067). Renders nothing.
 */
export function ClientTelemetry() {
  useReportWebVitals(
    (metric: { name: string; value: number; rating?: string }) => {
      if (!VITALS.has(metric.name) || !RATINGS.has(metric.rating ?? "")) return;
      telemetry.report({
        type: "web_vital",
        name: metric.name as "CLS" | "FCP" | "INP" | "LCP" | "TTFB",
        rating: metric.rating as "good" | "needs-improvement" | "poor",
        value: Math.max(0, Math.min(600_000, metric.value)),
        route: route()
      });
    }
  );

  useEffect(() => {
    const onError = (event: ErrorEvent) => {
      telemetry.report(
        clientError("error", event.error, route(), event.filename)
      );
    };
    const onRejection = (event: PromiseRejectionEvent) => {
      telemetry.report(
        clientError("unhandled_rejection", event.reason, route())
      );
    };
    const onHide = () => {
      if (document.visibilityState === "hidden") telemetry.flush();
    };
    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", telemetry.flush);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", telemetry.flush);
    };
  }, []);

  return null;
}
