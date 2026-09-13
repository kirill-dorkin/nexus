export type TelemetryService = "web" | "api" | "worker" | "grader-gateway";

export interface TelemetryBootstrapOptions {
  serviceName: TelemetryService;
  serviceVersion?: string;
}

/**
 * Placeholder port. OpenTelemetry SDK wiring belongs here so applications do not
 * depend directly on a vendor backend.
 */
export function bootstrapTelemetry(options: TelemetryBootstrapOptions): void {
  void options;
}
