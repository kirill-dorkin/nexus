import type { WebTelemetryEvent } from "@platform/contracts";

import { publicApiUrl } from "../public-api";

export type Send = (body: string) => void;

const MAX_BATCH = 20;
const MAX_ERRORS_PER_PAGE = 20;
const FLUSH_DELAY_MS = 5000;

/**
 * Batches events and sends them in the background. Repeated identical errors
 * are sent once per page, and a page sends at most a few dozen errors, so a
 * crash loop cannot flood the API.
 */
export function createReporter(release: string, send: Send) {
  let queue: WebTelemetryEvent[] = [];
  let timer: ReturnType<typeof setTimeout> | null = null;
  const seenErrors = new Set<string>();

  function flush() {
    if (timer !== null) clearTimeout(timer);
    timer = null;
    while (queue.length) {
      const events = queue.slice(0, MAX_BATCH);
      queue = queue.slice(MAX_BATCH);
      try {
        send(JSON.stringify({ release, events }));
      } catch {
        // Telemetry never breaks the page.
      }
    }
  }

  function report(event: WebTelemetryEvent) {
    if (event.type === "client_error") {
      const key = `${event.kind}:${event.errorName}:${event.source}:${event.route}`;
      if (seenErrors.has(key) || seenErrors.size >= MAX_ERRORS_PER_PAGE) return;
      seenErrors.add(key);
    }
    queue.push(event);
    if (queue.length >= MAX_BATCH) flush();
    else timer ??= setTimeout(flush, FLUSH_DELAY_MS);
  }

  return { report, flush };
}

/** Sends a batch to the API without blocking navigation or carrying cookies. */
export const sendToApi: Send = (body) => {
  void fetch(publicApiUrl("/v1/telemetry/web"), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body,
    keepalive: true,
    credentials: "omit"
  }).catch(() => undefined);
};
