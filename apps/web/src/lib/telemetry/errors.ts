import {
  WEB_ERROR_NAMES,
  type WebErrorName,
  type WebRoute,
  type WebTelemetryEvent
} from "@platform/contracts";

const NAMES: ReadonlySet<string> = new Set(WEB_ERROR_NAMES);

/** The error's name if it is one we tell apart; never its message. */
export function errorName(value: unknown): WebErrorName {
  if (!(value instanceof Error)) return "non_error";
  return NAMES.has(value.name) ? (value.name as WebErrorName) : "other";
}

/**
 * A client error event. `scriptUrl` is where an uncaught error was thrown;
 * a script from another origin (a browser extension, an embedded player)
 * counts as external so it does not hide the app's own errors.
 */
export function clientError(
  kind: "error" | "unhandled_rejection" | "render",
  value: unknown,
  route: WebRoute,
  scriptUrl?: string
): WebTelemetryEvent {
  let source: "app" | "external" = "app";
  if (scriptUrl) {
    try {
      source =
        new URL(scriptUrl).origin === window.location.origin
          ? "app"
          : "external";
    } catch {
      source = "external";
    }
  }
  return {
    type: "client_error",
    kind,
    errorName: errorName(value),
    source,
    route
  };
}
