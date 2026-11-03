import { z } from "zod";

import { WEB_ERROR_NAMES } from "./web-telemetry-names";

/*
 * Client telemetry from the Web app (ADR-0067). Like the public-launch
 * operational events (ADR-0052) every field is low-cardinality and carries no
 * identifier, URL, query, message or personal data.
 */

/** Route templates of the Web app; anything else reports as "other". */
export const webRouteSchema = z.enum([
  "/",
  "/blog",
  "/blog/[slug]",
  "/catalog/[organization]/products/[product]",
  "/checkout/paddle/[purchase]",
  "/courses",
  "/courses/[course]",
  "/courses/[course]/[lesson]",
  "/learn/[organization]/[offering]",
  "/learn/[organization]/[offering]/[lesson]",
  "/login",
  "/me/learning",
  "/purchases/[purchase]",
  "/studio",
  "/studio/[organization]/[course]",
  "/studio/[organization]/[course]/offerings",
  "/studio/[organization]/entry-policy",
  "/ui",
  "other"
]);

/** Error names worth telling apart; any other name reports as "other". */
export const webErrorNameSchema = z.enum(WEB_ERROR_NAMES);

export const webClientErrorSchema = z
  .object({
    type: z.literal("client_error"),
    /** A thrown error, a rejected promise nobody handled, or a render failure caught by a boundary. */
    kind: z.enum(["error", "unhandled_rejection", "render"]),
    errorName: webErrorNameSchema,
    /** "external": thrown by a script from another origin (an extension, a third-party player). */
    source: z.enum(["app", "external"]),
    route: webRouteSchema
  })
  .strict();

export const webVitalSchema = z
  .object({
    type: z.literal("web_vital"),
    name: z.enum(["CLS", "FCP", "INP", "LCP", "TTFB"]),
    rating: z.enum(["good", "needs-improvement", "poor"]),
    /** Milliseconds, or the unitless layout-shift score for CLS. */
    value: z.number().min(0).max(600_000),
    route: webRouteSchema
  })
  .strict();

export const webTelemetryEventSchema = z.discriminatedUnion("type", [
  webClientErrorSchema,
  webVitalSchema
]);

export const webTelemetryBatchSchema = z
  .object({
    /** The deployed build (a short commit hash, or "local"). */
    release: z.string().regex(/^[A-Za-z0-9._-]{1,40}$/),
    events: z.array(webTelemetryEventSchema).min(1).max(20)
  })
  .strict();

export type WebRoute = z.infer<typeof webRouteSchema>;
export type WebErrorName = z.infer<typeof webErrorNameSchema>;
export type WebTelemetryEvent = z.infer<typeof webTelemetryEventSchema>;
export type WebTelemetryBatch = z.infer<typeof webTelemetryBatchSchema>;
