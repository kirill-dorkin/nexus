export type TelemetryService = "web" | "api" | "worker" | "grader-gateway";

export type TelemetryBootstrapOptions = {
  serviceName: TelemetryService;
  serviceVersion?: string;
}

/**
 * Placeholder port. OpenTelemetry SDK wiring belongs here so applications do not
 * depend directly on a vendor backend.
 */
export function bootstrapTelemetry(_options: TelemetryBootstrapOptions): void {
  // Intentionally empty until an OpenTelemetry exporter is chosen.
}
