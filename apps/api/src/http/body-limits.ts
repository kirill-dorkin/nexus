import type { FastifyAdapter } from "@nestjs/platform-fastify";

/**
 * Request body limit for importing a whole course manifest.
 *
 * Every other route keeps Fastify's 1 MiB default. A full-coverage course
 * manifest is one JSON document (the JavaScript track is ~0.86 MB), so the
 * two manifest routes get more room. The value stays below the 4.5 MB request
 * body cap of Vercel Functions, where production runs: above it the platform
 * refuses the request before the API sees it, so a larger limit here would
 * only be a promise production cannot keep. Both routes need manage authority
 * on the Organization, exact Origin and pass the strict manifest schema.
 */
export const COURSE_MANIFEST_BODY_LIMIT_BYTES = 4 * 1024 * 1024;

const COURSE_MANIFEST_ROUTES = new Set([
  "/v1/organizations/:organizationId/courses/manifest/validate",
  "/v1/organizations/:organizationId/courses/manifest/apply"
]);

/** Raises the body limit of the manifest import routes only. Call before routes register. */
export function registerRouteBodyLimits(adapter: FastifyAdapter): void {
  adapter.getInstance().addHook("onRoute", (route) => {
    if (route.method === "POST" && COURSE_MANIFEST_ROUTES.has(route.url))
      route.bodyLimit = COURSE_MANIFEST_BODY_LIMIT_BYTES;
  });
}
